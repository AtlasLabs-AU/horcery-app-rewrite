import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import {
  horseSelectionKey,
  joinHorseRow,
  stallLiveStreamUrl,
  type HorseRow,
} from '@/hooks/horses-data';
import { buildPassport, type PassportField } from '@/hooks/horse-detail-data';
import { useHorseGroups } from '@/hooks/use-horse-groups';

/** Same 5-minute slice as `useHorses`/`useSnapshots`: one frame URL app-wide. */
const FRAME_SLICE_SECONDS = 300;

function quantisedEpoch(refreshToken: number) {
  const seconds = DateTime.now().toSeconds();
  return Math.floor(seconds / FRAME_SLICE_SECONDS) * FRAME_SLICE_SECONDS + refreshToken;
}

export interface HorseDetail {
  row: HorseRow | null;
  passport: PassportField[];
  stallId?: string;
  /** The full stall record — slice 2 reads its Prometheus URL and monitor. */
  stall: IStall | undefined;
  /** Live HLS manifest for this horse's stall, when it has a camera to stream. */
  liveUri: string | undefined;
  /** The horse's first day in the system — the date bar's earliest bound. */
  createdAt: DateTime | undefined;
  /** True once we know the horse exists and has no stall — not while loading. */
  hasNoStall: boolean;
  /**
   * True only when the horse's details actually LOADED.
   *
   * Deliberately NOT `isSuccess || isError`: an errored request tells us
   * nothing about the stall, and treating it as resolved made the page state
   * "No stall monitor" as a fact about a horse that may well have one
   * (review, 2026-08-17).
   */
  hasResolvedStall: boolean;
  /** The details request failed. Callers must say "unknown", never guess. */
  detailsFailed: boolean;
  isLoading: boolean;
  isError: boolean;
  notFound: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  retry: () => void;
}

/**
 * Everything the horse's own page knows about it, page-scoped.
 *
 * **Deliberately not a global store.** The current app keeps this in a shared
 * zustand `useAnimalDetailStore` that Stall Details also writes to, so state
 * leaks between the two pages and every widget reads a singleton instead of
 * its inputs (scope §4.1 F11). A hook per page cannot leak.
 *
 * Request budget — three, and two are usually already cached:
 * 1. `animal.detail` — the page's own resource; also carries `stall`, so the
 *    animal→stall link costs nothing extra.
 * 2. `animalGroup.listComplete` via `useHorseGroups` — the same key the list
 *    screen already filled, and `IAnimalGroup.animal_id` tells us this
 *    horse's groups without a membership request.
 * 3. the `horseSelectionKey` cache the list wrote on tap — not a request at
 *    all, and what lets the page paint a name and a frame immediately.
 *
 * The current app's equivalent path is ~30 requests (scope §1.7).
 */
export function useHorseDetail(id: string): HorseDetail {
  const queryClient = useQueryClient();
  const organizationID = useAuthStore((s) => s.organizationID);
  const isMetric = useAuthStore((s) => s.userPreferences?.isMetric ?? true);
  const groupsQuery = useHorseGroups();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const isSample = id.startsWith('sample-');
  const enabled = !!id && !isSample && !!organizationID;

  const animalQuery = useQuery({
    ...queries.animal.detail(id, {
      deleted_at__isnull: true,
      organization_id: organizationID ?? '',
    }),
    enabled,
    select: (response) => response.data,
  });

  const animal = animalQuery.data;

  /**
   * The horse's stall — a SEPARATE request, because `animal.detail` does not
   * carry the relation.
   *
   * Slice 1 assumed `animal.stall` would be populated and it never is: on
   * device, a horse the list showed in "SM-93 Test 7" opened to a detail page
   * claiming "No stall" and "No stall monitor" (caught 2026-08-17). The list
   * gets its stalls from an organisation-wide `animalStall` + `stall` join;
   * the current app fetches this same link per horse. One small filtered
   * request is the right cost here — reusing the list's org-wide reads would
   * be free on arrival from the list but expensive on a deep link.
   */
  const linkQuery = useQuery({
    ...queries.animalStall.list(
      {
        organization_id: organizationID ?? '',
        deleted_at__isnull: true,
        include: 'stall',
      },
      [{ key: 'animal_id', value: id }],
    ),
    enabled,
  });

  const stall = useMemo<IStall | undefined>(() => {
    // The API expands `stall` when asked; a string means it did not.
    const link = (linkQuery.data?.data ?? []).find((row) => !row.deleted_at);
    const expanded = link && typeof link.stall !== 'string' ? link.stall : undefined;
    return expanded ?? animal?.stall;
  }, [linkQuery.data, animal?.stall]);

  const { groupsFor, refetch: refetchGroups } = groupsQuery;
  const { refetch: refetchLink } = linkQuery;
  const groupNames = useMemo(
    () => groupsFor(id).map((group) => group.name),
    [groupsFor, id],
  );

  const row = useMemo(() => {
    // Read the cache inside the memo, not during render: the compiler cannot
    // prove a value pulled out of the query cache stays unmutated, and
    // hoisting it costs the component its memoization.
    if (animal) {
      return joinHorseRow(animal, stall, quantisedEpoch(refreshToken));
    }
    return queryClient.getQueryData<HorseRow>(horseSelectionKey(id)) ?? null;
  }, [animal, stall, queryClient, id, refreshToken]);

  const passport = useMemo(
    () => buildPassport({ animal, stall, groupNames, isMetric }),
    [animal, stall, groupNames, isMetric],
  );

  // Memoised on the raw string: built inline, this handed a new DateTime to
  // `usePlayhead` on every render, whose own memo then recomputed the day and
  // cursor every render for no change in value.
  // Bound to a local first: with `animal?.created_at` read inside the memo,
  // the React Compiler infers a dependency on the whole `animal` object and
  // refuses to preserve the memoization at all.
  const createdAtISO = animal?.created_at;
  const createdAt = useMemo(
    () => (createdAtISO ? DateTime.fromISO(createdAtISO) : undefined),
    [createdAtISO],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    // Bump only on an explicit pull, so repeat renders keep reusing the
    // cached frame — the reason the epoch is quantised at all.
    setRefreshToken((token) => token + 1);
    try {
      await Promise.all([animalQuery.refetch(), refetchLink(), refetchGroups()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [animalQuery, refetchLink, refetchGroups]);

  const retry = useCallback(() => {
    void animalQuery.refetch();
    void refetchLink();
    void refetchGroups();
  }, [animalQuery, refetchLink, refetchGroups]);

  return {
    row,
    passport,
    stallId: stall?.id,
    stall,
    liveUri: stallLiveStreamUrl(stall),
    createdAt,
    hasNoStall: linkQuery.isSuccess && !stall,
    // Both must have landed: the animal alone cannot tell us about the stall.
    hasResolvedStall: animalQuery.isSuccess && linkQuery.isSuccess,
    detailsFailed: animalQuery.isError || linkQuery.isError,
    isLoading: animalQuery.isPending && enabled && !row,
    isError: animalQuery.isError,
    notFound: enabled && animalQuery.isSuccess && !animal,
    isRefreshing,
    refresh,
    retry,
  };
}
