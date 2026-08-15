import { useInfiniteQuery } from '@tanstack/react-query';
import type { DateTime } from 'luxon';
import { useMemo } from 'react';

import type { IEvent } from '@acme/services/api/event-management/event';
import type { IGenericResponse } from '@acme/services/base/generic-interfaces';
import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';

/** One page of events; 50 matches the current app's For You review query. */
const PAGE_SIZE = 50;

/**
 * Behaviour types the history shows when no filter is applied.
 *
 * Two corrections to the current app's list, both live bugs there
 * (`Horcery_Review_History_Dev_Tickets.md`):
 *
 * - **Lying Down is `sitting_down` (100), not `sitting` (570).** The current
 *   screen asks for 570, a raw pose type, so an unfiltered History omits
 *   Lying Down entirely while For You — which asks for 100 — shows it.
 * - **Partial Rolling is three ids, not one.** The filter sheet collapses
 *   103/104/105 into one row; For You re-expands them before querying and
 *   History never did, so the same filter returned fewer rows here.
 */
export const BEHAVIOR_EVENT_TYPES = {
  lyingDown: [100],
  partialRolling: [103, 104, 105],
  peopleInStall: [101],
  standing: [102],
} as const;

export const DEFAULT_EVENT_TYPES = [
  ...BEHAVIOR_EVENT_TYPES.lyingDown,
  ...BEHAVIOR_EVENT_TYPES.partialRolling,
  ...BEHAVIOR_EVENT_TYPES.peopleInStall,
  ...BEHAVIOR_EVENT_TYPES.standing,
  // Alerts are IN by default (Inakshi, 2026-08-15). The current app excludes
  // them, so alert history lives behind a separate deep link — two screens
  // for one question.
  EVENT_TYPE_ID.alert,
];

export interface ReviewHistoryOptions {
  /** The selected day, already in the organization's zone. */
  day: DateTime;
  /** Event type ids to show; defaults to everything above. */
  eventTypes?: number[];
  animalId?: string;
  stallId?: string;
}

/**
 * The Review History read path.
 *
 * Differences from the current app's version, all deliberate:
 * - The day window is built in the ORGANIZATION's zone (the caller passes a
 *   zoned DateTime), not the device's.
 * - `page_size` is explicit. The current app sends none, so page length is
 *   whatever the server defaults to.
 * - The end of the window is rounded to the minute, so pull-to-refresh reuses
 *   the cache key instead of minting a new one per refresh.
 */
export function useReviewHistory({
  day,
  eventTypes = DEFAULT_EVENT_TYPES,
  animalId,
  stallId,
}: ReviewHistoryOptions) {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID;

  const { startISO, endISO } = useMemo(() => {
    const start = day.startOf('day');
    const end = day.endOf('day');
    // Round to the minute: a millisecond-precision bound would make every
    // render a new query key.
    return {
      startISO: start.toISO() ?? '',
      endISO: end.startOf('minute').toISO() ?? '',
    };
  }, [day]);

  const additionalParams = useMemo(() => {
    const params: { key: string; value: string }[] = [
      { key: 'event_type__in', value: eventTypes.join(',') },
      { key: 'start_time__gte', value: startISO },
      { key: 'start_time__lte', value: endISO },
    ];
    if (animalId) params.push({ key: 'animal_id', value: animalId });
    if (stallId) params.push({ key: 'stall_id', value: stallId });
    return params;
  }, [eventTypes, startISO, endISO, animalId, stallId]);

  const query = useInfiniteQuery({
    ...queries.event.infiniteList(
      {
        page_size: PAGE_SIZE,
        ordering: '-start_time,-event_type',
        deleted_at__isnull: true,
        organization_id: organizationID ?? '',
        include: 'created_by,stall_id,animal_id',
      },
      additionalParams,
    ),
    initialPageParam: '1',
    getNextPageParam: (lastPage: IGenericResponse<IEvent[]>) =>
      lastPage.meta?.has_next ? lastPage.meta.next : undefined,
    enabled,
  });

  const events = useMemo(
    () => query.data?.pages.flatMap((page) => page.data ?? []) ?? [],
    [query.data],
  );

  return {
    events,
    total: query.data?.pages[0]?.meta?.count ?? events.length,
    isLoading: query.isPending && enabled,
    isError: query.isError,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}
