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
 * The behaviour filter — the SAME seven rows the current app offers, in the
 * same order, with the same labels (`behavior-constants.ts` in the old repo).
 *
 * This list is a port, not a redesign. An earlier version of this file invented
 * a shorter list and mislabelled two ids (102 is Rolling, not "Standing"; 101
 * is Standing Up, not "People in Stall"), which meant the filter asked the
 * server for the wrong events. Corrected 2026-08-16 — do not edit these ids
 * without checking them against the old repo's event-type table.
 *
 * The one deliberate correction carried over: **Partial Rolling is three ids,
 * not one.** The current filter sheet sends 105 alone while For You expands to
 * 103/104/105, so the same filter returns fewer rows in History than the card
 * that linked to it (`Horcery_Review_History_Dev_Tickets.md`).
 */
export const BEHAVIOR_EVENT_TYPES = {
  rolling: [102],
  partialRolling: [103, 104, 105],
  lyingDown: [100],
  peoplePresent: [204],
  peopleInteraction: [205],
  exiting: [81],
  entering: [80],
} as const;

/** Event type ids that are not behaviours but do belong in an unfiltered day. */
const SPECIAL_INSTRUCTIONS = 7;
const PEOPLE_IN_STALL = 200;

/**
 * What an unfiltered day shows — the current app's default list, with one bug
 * fixed: it asks for `sitting` (570, a raw pose) where it means `sitting_down`
 * (100, "Lying Down"), so Lying Down never appears in an unfiltered History
 * there even though For You shows it.
 */
export const DEFAULT_EVENT_TYPES = [
  SPECIAL_INSTRUCTIONS,
  ...BEHAVIOR_EVENT_TYPES.entering,
  ...BEHAVIOR_EVENT_TYPES.exiting,
  ...BEHAVIOR_EVENT_TYPES.rolling,
  ...BEHAVIOR_EVENT_TYPES.partialRolling,
  ...BEHAVIOR_EVENT_TYPES.lyingDown,
  PEOPLE_IN_STALL,
  ...BEHAVIOR_EVENT_TYPES.peoplePresent,
  ...BEHAVIOR_EVENT_TYPES.peopleInteraction,
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
