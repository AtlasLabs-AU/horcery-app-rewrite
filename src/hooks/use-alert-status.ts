import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import { queries } from '@acme/services';
import { useOrganizationNow } from '@/hooks/use-organization-now';

/**
 * The organization's headline health, derived — never assumed.
 *
 * Mirrors the current app's `organization-details-widget`: state comes from
 * (a) whether any alert rules are configured and (b) how many alert events
 * started today. Three things this adds, all from review:
 *
 * - **`loading` and `unavailable` states.** A monitoring app must never
 *   present "unknown" as "normal" (requirements §6b item 2).
 * - **The organization's timezone, and a day that actually rolls over.**
 *   "Today" was computed once, in the device zone, so an app left open past
 *   midnight kept counting yesterday, and a travelling manager saw a shifted
 *   window. `useOrganizationNow` re-derives it on each minute boundary in the
 *   barn's zone (requirements §6c).
 * - **Honest wording.** The query counts alert events *started today*, which
 *   is not the same as alerts still unresolved. The current app labels these
 *   "active alerts"; until the backend exposes a resolved/unresolved state we
 *   say "today", because overstating on a monitoring screen is the one thing
 *   this rewrite exists to stop. `kind` is `today`, not `active`.
 */
export type AlertStatus =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'not_set' }
  | { kind: 'normal'; rulesConfigured: number }
  | { kind: 'today'; count: number; rulesConfigured: number };

export function useAlertStatus(
  organizationID: string | null | undefined,
  timezone?: string | null,
): AlertStatus {
  const enabled = !!organizationID;
  const now = useOrganizationNow(timezone);

  // page_size 1: only the count matters.
  const rules = useQuery({
    ...queries.alertRule.list({ page_size: 1, ordering: '-created_at' }, [
      { key: 'organization_id', value: organizationID ?? '' },
      { key: 'deleted_at__isnull', value: 'true' },
    ]),
    enabled,
  });

  /**
   * Keyed to the DAY, not the instant. `now` ticks every minute, but midnight
   * in the barn's zone yields the SAME string all day, and React Query hashes
   * keys by value — so this does not mint a cache entry per minute (which was
   * the shape of the pull-to-refresh cache leak in the current app's history
   * screen). It changes exactly once, when the barn's date rolls over, and
   * the day's alert count refetches for the new day.
   */
  const startOfToday = now.startOf('day').toISO() ?? '';

  const alertsToday = useQuery({
    ...queries.event.list(
      {
        page_size: 1,
        ordering: '-start_time',
        deleted_at__isnull: true,
        organization_id: organizationID ?? '',
      },
      [
        { key: 'event_type', value: String(EVENT_TYPE_ID.alert) },
        { key: 'start_time__gte', value: startOfToday },
        { key: 'start_time__lte', value: 'now' },
      ],
    ),
    enabled,
  });

  return useMemo<AlertStatus>(() => {
    if (!enabled || rules.isPending || alertsToday.isPending) return { kind: 'loading' };
    if (rules.isError || alertsToday.isError) return { kind: 'unavailable' };

    const rulesMeta = rules.data?.meta as { count?: number; total?: number } | undefined;
    const rulesConfigured =
      rulesMeta?.count ?? rulesMeta?.total ?? rules.data?.data?.length ?? 0;
    if (rulesConfigured === 0) return { kind: 'not_set' };

    const count = alertsToday.data?.meta?.count ?? 0;
    return count > 0
      ? { kind: 'today', count, rulesConfigured }
      : { kind: 'normal', rulesConfigured };
  }, [enabled, rules, alertsToday]);
}
