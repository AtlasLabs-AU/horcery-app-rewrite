import type { DateTime } from 'luxon';

import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';

/**
 * Review History's pure data rules, kept out of the hook so they can be tested
 * without pulling in the auth store (which needs AsyncStorage and therefore a
 * native runtime). Same split as `horses-data.ts` beside `use-horses.ts`.
 */

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

/**
 * Event type ids that are not behaviours but do belong in an unfiltered day.
 *
 * Special Instructions (type 7) is deliberately NOT here. The shipping app
 * requests it by default; it is a manually-typed note and therefore part of
 * the Record family the rewrite removed (requirements §2; Inakshi, 2026-08-17:
 * "special instructions is part of the record feature where we expect the
 * customer to enter text"). Do not add it back.
 */
const PEOPLE_IN_STALL = 200;

/**
 * What an unfiltered day shows — the current app's default list, with one bug
 * fixed: it asks for `sitting` (570, a raw pose) where it means `sitting_down`
 * (100, "Lying Down"), so Lying Down never appears in an unfiltered History
 * there even though For You shows it.
 */
export const DEFAULT_EVENT_TYPES = [
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

/**
 * The ISO bounds of the window, pure so the maths can be characterized without
 * mounting a query.
 *
 * `windowDays - 1` so a window of 1 is exactly `day` — not `day` plus the day
 * before it. The end is rounded to the minute: a millisecond-precision bound
 * would mint a new query key on every render, so nothing would ever hit cache.
 */
export function eventWindow(day: DateTime, windowDays = 1) {
  const start = day.minus({ days: Math.max(0, windowDays - 1) }).startOf('day');
  const end = day.endOf('day');
  return {
    startISO: start.toISO() ?? '',
    endISO: end.startOf('minute').toISO() ?? '',
  };
}

