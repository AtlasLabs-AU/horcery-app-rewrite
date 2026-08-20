import { useInfiniteQuery } from '@tanstack/react-query';
import type { DateTime } from 'luxon';
import { useMemo } from 'react';

import type { IEvent } from '@acme/services/api/event-management/event';
import type { IGenericResponse } from '@acme/services/base/generic-interfaces';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { DEFAULT_EVENT_TYPES, eventWindow } from '@/hooks/review-history-data';

export {
  BEHAVIOR_EVENT_TYPES,
  DEFAULT_EVENT_TYPES,
  eventWindow,
} from '@/hooks/review-history-data';

/** One page of events; 50 matches the current app's For You review query. */
const PAGE_SIZE = 50;

export interface ReviewHistoryOptions {
  /** The selected day, already in the organization's zone. */
  day: DateTime;
  /** Event type ids to show; defaults to everything above. */
  eventTypes?: number[];
  animalId?: string;
  stallId?: string;
  /**
   * How many days the window spans, ending on `day`. Defaults to 1 — a single
   * day, which is what Review History asks for.
   *
   * A horse's own page asks for 10, matching the current app's per-horse feed
   * (`animal-details/feeds`). Both screens share this one read path so a
   * change to paging, ordering or the zone rule cannot apply to one and not
   * the other.
   */
  windowDays?: number;
  /**
   * Off by default for a tab that is not on screen. The horse's page holds an
   * Events and an Alerts tab; fetching both when you open the page pays for a
   * list nobody has looked at yet (PRINCIPLES #2). The cache keeps whichever
   * you visited, so switching back is instant.
   */
  enabled?: boolean;
  /** Explicit page size for the consuming surface; History defaults to 50. */
  pageSize?: number;
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
  windowDays = 1,
  enabled: callerEnabled = true,
  pageSize = PAGE_SIZE,
}: ReviewHistoryOptions) {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID && callerEnabled;

  const { startISO, endISO } = useMemo(() => eventWindow(day, windowDays), [day, windowDays]);

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
        page_size: pageSize,
        ordering: '-start_time,-event_type',
        deleted_at__isnull: true,
        organization_id: organizationID ?? '',
        include: 'stall_id,animal_id',
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
