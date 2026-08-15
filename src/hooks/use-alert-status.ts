import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useMemo } from 'react';

import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import { queries } from '@acme/services';

/**
 * The organization's headline health, derived — never assumed.
 *
 * Mirrors the current app's `organization-details-widget`: state comes from
 * (a) whether any alert rules are configured and (b) how many alert events
 * started today. Two states it did NOT have, added after the 2026-08-15
 * review: `loading` while either answer is pending, and `unavailable` when
 * either request failed. A monitoring app must never present "unknown" as
 * "normal" (requirements §6b item 2; PRINCIPLES.md #5, #11).
 */
export type AlertStatus =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'not_set' }
  | { kind: 'normal'; rulesConfigured: number }
  | { kind: 'active'; count: number; rulesConfigured: number };

export function useAlertStatus(organizationID: string | null | undefined): AlertStatus {
  const enabled = !!organizationID;

  // page_size 1: only the count matters.
  const rules = useQuery({
    ...queries.alertRule.list({ page_size: 1, ordering: '-created_at' }, [
      { key: 'organization_id', value: organizationID ?? '' },
      { key: 'deleted_at__isnull', value: 'true' },
    ]),
    enabled,
  });

  const startOfToday = useMemo(() => DateTime.now().startOf('day').toISO(), []);

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
        { key: 'start_time__gte', value: startOfToday ?? '' },
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
      ? { kind: 'active', count, rulesConfigured }
      : { kind: 'normal', rulesConfigured };
  }, [enabled, rules, alertsToday]);
}
