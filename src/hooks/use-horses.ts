import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import type { IGenericResponse } from '@acme/services/base/generic-interfaces';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { joinHorseRow, type HorseRow } from '@/hooks/horses-data';

export type { HorseRow } from '@/hooks/horses-data';

/** Same slice as `useSnapshots`, so both screens ask for the same frame URL. */
const FRAME_SLICE_SECONDS = 300;

export interface HorsesOptions {
  /** Animal group id, or undefined for every horse. */
  groupId?: string;
  /** Free-text search, sent to the server as `search`. */
  search?: string;
  pageSize?: number;
}

/**
 * The Horses list read path.
 *
 * The current app pays two additional data requests per visible horse: its
 * stall link and a Prometheus in-stall query. Here those fan-out reads are
 * replaced by organization-level joins:
 *
 * 1. `animal.infiniteList` — one request per visible page;
 * 2. complete `animalStall` and `stall` reads — one request per backend page,
 *    joined in memory so a large organization cannot silently lose links;
 * 3. groups come from `useHorseGroups` through the same complete-read shape.
 *
 * No Prometheus query at all: the list shows name + stall by decision
 * (Inakshi, 2026-08-16); in-stall status belongs to the horse's detail page.
 * That also retires the current app's frozen-clock bug on the In/Out pill.
 */
export function useHorses({ groupId, search, pageSize = 20 }: HorsesOptions = {}) {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID;
  /**
   * Pull-to-refresh with its own flag: `isRefetching` on one query cannot
   * stand for three, and a spinner that stops before the stall names arrive
   * reads as "done" when it is not.
   */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFrameToken, setRefreshFrameToken] = useState(0);

  const additionalParams = useMemo(
    () => (groupId ? [{ key: 'animal_group_id', value: groupId }] : []),
    [groupId],
  );

  const animalsQuery = useInfiniteQuery({
    ...queries.animal.infiniteList(
      {
        ordering: 'animal_name',
        page_size: pageSize,
        organization_id: organizationID ?? '',
        deleted_at__isnull: true,
        // `search` is the server's own free-text filter (the current app's
        // Show Me screen uses it), so typing narrows every page, not just
        // the ones already loaded.
        ...(search ? { search } : {}),
      },
      additionalParams,
    ),
    initialPageParam: 1,
    getNextPageParam: (
      lastPage: IGenericResponse<IAnimal[]>,
      allPages: IGenericResponse<IAnimal[]>[],
    ) => (lastPage.meta?.has_next ? allPages.length + 1 : undefined),
    enabled,
  });

  const stallsQuery = useQuery({
    ...queries.stall.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
      page_size: 100,
    }),
    enabled,
  });

  const linksQuery = useQuery({
    ...queries.animalStall.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
      page_size: 100,
    }),
    enabled,
  });

  const rows = useMemo<HorseRow[]>(() => {
    const animals = animalsQuery.data?.pages.flatMap((page) => page.data ?? []) ?? [];
    if (!animals.length) return [];

    const stallsById = new Map<string, IStall>(
      (stallsQuery.data ?? []).map((stall) => [stall.id, stall]),
    );
    const stallByAnimalId = new Map<string, IStall>();
    for (const link of linksQuery.data ?? []) {
      if (link.deleted_at) continue;
      const stallId = typeof link.stall === 'string' ? link.stall : link.stall?.id;
      const stall = stallId ? stallsById.get(stallId) : undefined;
      if (stall) stallByAnimalId.set(link.animal_id, stall);
    }

    // Five minutes back and quantised, for the reasons written in
    // `useSnapshots`: the newest slice is not always flushed, and a stable
    // URL is what lets expo-image reuse the frame across refetches.
    const epoch =
      Math.floor(
        DateTime.now().minus({ minutes: 5 }).toSeconds() / FRAME_SLICE_SECONDS,
      ) * FRAME_SLICE_SECONDS;

    return animals.map((animal) =>
      joinHorseRow(
        animal,
        stallByAnimalId.get(animal.id ?? ''),
        epoch,
        refreshFrameToken,
      ),
    );
  }, [animalsQuery.data, stallsQuery.data, linksQuery.data, refreshFrameToken]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setRefreshFrameToken((token) => token + 1);
      await Promise.all([animalsQuery.refetch(), stallsQuery.refetch(), linksQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [animalsQuery, stallsQuery, linksQuery]);

  return {
    rows,
    total: animalsQuery.data?.pages[0]?.meta?.count ?? rows.length,
    isLoading:
      enabled && (animalsQuery.isPending || stallsQuery.isPending || linksQuery.isPending),
    isError: animalsQuery.isError || stallsQuery.isError || linksQuery.isError,
    refetch: () => Promise.all([animalsQuery.refetch(), stallsQuery.refetch(), linksQuery.refetch()]),
    refresh,
    isRefreshing,
    fetchNextPage: animalsQuery.fetchNextPage,
    hasNextPage: animalsQuery.hasNextPage,
    isFetchingNextPage: animalsQuery.isFetchingNextPage,
  };
}
