import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { horseSelectionKey, joinHorseRow, type HorseRow } from '@/hooks/horses-data';
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
  /** The horse's first day in the system — the date bar's earliest bound. */
  createdAt: DateTime | undefined;
  /** True once we know the horse exists and has no stall — not while loading. */
  hasNoStall: boolean;
  /** True once the animal query has settled, success or not — not "we have a stall". */
  hasResolvedStall: boolean;
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

  const { groupsFor, refetch: refetchGroups } = groupsQuery;
  const groupNames = useMemo(
    () => groupsFor(id).map((group) => group.name),
    [groupsFor, id],
  );

  const row = useMemo(() => {
    // Read the cache inside the memo, not during render: the compiler cannot
    // prove a value pulled out of the query cache stays unmutated, and
    // hoisting it costs the component its memoization.
    if (animal) {
      return joinHorseRow(animal, animal.stall, quantisedEpoch(refreshToken));
    }
    return queryClient.getQueryData<HorseRow>(horseSelectionKey(id)) ?? null;
  }, [animal, queryClient, id, refreshToken]);

  const passport = useMemo(
    () => buildPassport({ animal, stall: animal?.stall, groupNames, isMetric }),
    [animal, groupNames, isMetric],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    // Bump only on an explicit pull, so repeat renders keep reusing the
    // cached frame — the reason the epoch is quantised at all.
    setRefreshToken((token) => token + 1);
    try {
      await Promise.all([animalQuery.refetch(), refetchGroups()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [animalQuery, refetchGroups]);

  const retry = useCallback(() => {
    void animalQuery.refetch();
    void refetchGroups();
  }, [animalQuery, refetchGroups]);

  return {
    row,
    passport,
    stallId: animal?.stall?.id,
    stall: animal?.stall,
    createdAt: animal?.created_at ? DateTime.fromISO(animal.created_at) : undefined,
    hasNoStall: !!animal && !animal.stall,
    hasResolvedStall: animalQuery.isSuccess || animalQuery.isError,
    isLoading: animalQuery.isPending && enabled && !row,
    isError: animalQuery.isError,
    notFound: enabled && animalQuery.isSuccess && !animal,
    isRefreshing,
    refresh,
    retry,
  };
}
