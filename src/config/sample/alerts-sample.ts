/**
 * Sample alert RULES for design review of Manage Alerts, used only when
 * `PREVIEWS.sampleAlertsData` is on and the organization has no rules. The
 * alert TYPES are never sampled — they are product configuration and come
 * from the API (or, if that fails, from the A0 fixture, which IS the API's
 * answer as of 2026-08-17).
 *
 * The set is chosen to exercise every family the row must render: degrees
 * (metric and imperial), temp-change drop, count with "within any", both
 * duration shapes, selection, boolean with trigger, an include-scope, a rule
 * WITH drift metadata (saved in summer, read in winter shows the badge), and
 * one authored "by the old app" (no metadata → no badge, by design).
 *
 * Shapes are the server's (`ServerAlertRule`); values are storage units.
 */

import { AlertCondition } from '@/config/enums/alert-conditions';
import type { ServerAlertRule, ServerAlertType } from '@/domain/alerts/types';

import alertTypesFixture from '@/domain/alerts/__fixtures__/alert-types.json';

/** The real server alert types (A0), for when the API is unavailable in preview. */
export const SAMPLE_ALERT_TYPES = alertTypesFixture as unknown as ServerAlertType[];

const typeId = (slug: string): string => {
  const t = SAMPLE_ALERT_TYPES.find((x) => x.slug === slug);
  if (!t?.id) throw new Error(`sample: unknown alert type ${slug}`);
  return t.id;
};

/** A summer-saved Chicago window: 06:30–13:00 CDT stored as 11:30–18:00 UTC. */
const CHICAGO_SUMMER_WINDOW = {
  evaluation_start_time: '11:30:00',
  evaluation_end_time: '18:00:00',
};

/**
 * "Any time" as the rewrite writes it for Chicago in winter (00:00–23:59 CST
 * = 06:00–05:59 UTC) WITH the metadata block, so the sample reads as any time
 * in either season. Old-app rules stored 00:00–23:59 UTC, which is NOT any
 * time in Chicago and reads as an overnight window — that is correct and is
 * what `sample-temp-imperial` (no metadata) demonstrates.
 */
const ANY_TIME_CHICAGO = {
  evaluation_start_time: '06:00:00',
  evaluation_end_time: '05:59:59',
  UNATTESTED_META_DATA: {
    window: {
      zone: 'America/Chicago',
      start_local: '00:00',
      end_local: '23:59',
      saved_offset_min: -360,
      saved_at: '2026-01-10T12:00:00.000Z',
    },
  },
};

const base = (id: string, slug: string, over: Partial<ServerAlertRule>): ServerAlertRule => ({
  id: `sample-${id}`,
  alert_type: typeId(slug),
  organization_id: 'sample-org',
  condition: AlertCondition.GREATER_THAN,
  threshold_value: 1,
  display_value: null,
  is_custom: false,
  is_custom_duration: true,
  trigger_duration: null,
  query_range_duration: null,
  query_type: 1,
  apply_type: 1,
  apply_condition: 1,
  notify_condition: 1,
  is_push: true,
  is_sms: false,
  is_email: false,
  alert_application_rules: [],
  alert_notification_rules: [],
  ...ANY_TIME_CHICAGO,
  ...over,
});

export const SAMPLE_ALERT_RULES: ServerAlertRule[] = [
  // Saved in July with our metadata; read after the clock change → drift badge.
  base('temp-drift', 'temperature', {
    threshold_value: 30,
    ...CHICAGO_SUMMER_WINDOW,
    UNATTESTED_META_DATA: {
      window: {
        zone: 'America/Chicago',
        start_local: '06:30',
        end_local: '13:00',
        saved_offset_min: -300,
        saved_at: '2026-07-15T12:00:00.000Z',
      },
    },
  }),
  // Imperial author: typed 30 °F, stored −1.1 °C. Old-app rule (no metadata).
  base('temp-imperial', 'temperature', {
    threshold_value: -1.1,
    display_value: 30,
    ...CHICAGO_SUMMER_WINDOW,
  }),
  base('temp-drop', 'temp-change', {
    condition: AlertCondition.LESS_THAN,
    threshold_value: -10,
    query_range_duration: '01:00:00',
  }),
  base('lying-count', 'lying-down-count', {
    threshold_value: 3,
    query_range_duration: '01:00:00',
  }),
  // Duration, continuous shape.
  base('lying-time-single', 'lying-down-time', {
    threshold_value: 1,
    trigger_duration: '02:00:00',
    is_custom_duration: false,
    apply_type: 2, // horses
    apply_condition: 2, // include two horses
    alert_application_rules: [
      { id: 'rel-a', object_id: 'sample-horse-1' },
      { id: 'rel-b', object_id: 'sample-horse-2' },
    ],
  }),
  // Duration, combined shape (seconds in threshold, no trigger).
  base('people-time-total', 'people-in-stall-time', {
    threshold_value: 9000,
    query_type: 2,
    is_custom_duration: false,
    notify_condition: 2, // notify one person
    alert_notification_rules: [{ id: 'rel-c', member_id: 'sample-member-me' }],
  }),
  base('light-high', 'light', {
    condition: AlertCondition.EQUAL_TO,
    threshold_value: 1,
    trigger_duration: '00:20:00',
    is_custom_duration: false,
  }),
  base('person-enters', 'people-in-stall', {
    threshold_value: 1,
    trigger_duration: '00:05:00',
  }),
];

/** The member id that makes the "Me" tag appear in sample mode. */
export const SAMPLE_CURRENT_MEMBER_ID = 'sample-member-me';
