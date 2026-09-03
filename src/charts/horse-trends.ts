import { DateTime } from 'luxon';

import { barnDayKeyForInstant } from '@/charts/barn-day';

/**
 * Horse Trends — Activeness and Rolling on the Horse Details page.
 *
 * Product decisions (Inakshi, 2026-08-21):
 *
 * - Ranges are called **24 hours / 7 days**, not Hourly/Daily: the short view
 *   is a rolling window ending now (the mock's own axis runs 3 AM → 3 AM), and
 *   calling that "Daily" invites "why does my day start at 3 AM?". Recorded as
 *   a deviation from the Figma annotation, which says Daily/Weekly.
 * - **No Higher/Usual/Lower pill** until Data Science approves the comparison.
 *   The shipping pill reads "Higher" on any difference at all — one extra
 *   minute — so it is nearly never "Usual"; the replacement thresholds sit on
 *   an unmerged branch. The slot exists; it stays empty.
 * - **"Partial Rolling" keeps the established grouping** of partial_rolling +
 *   lateral/sternal recumbency (103/104/105): the same expansion Review
 *   History was fixed to use (ticket D2). One vocabulary across the app.
 * - Rolling 24 hours is an **event strip at exact times**, not hour buckets;
 *   rolling 7 days is **this week's bars with last week as markers**, the
 *   idiom the weekly behaviour charts already use, today hollow.
 *
 * What this module refuses to inherit from the shipping widget: the ×1000
 * scaling with no unit, phone-timezone day boundaries, missing days drawn as
 * zeros, and last week reconstructed by adding seven days to timestamps.
 */

export interface TrendPoint {
  at: number;
  value: number;
}

export interface TrendGap {
  from: number;
  to: number;
}

export interface ActivenessDay {
  /** Raw activeness points across the window. Unit is UNNAMED until Data
   * Science names one — the model never scales or invents a label. */
  points: TrendPoint[];
  /** Stretches the monitor did not report, drawn as gaps, never as zero. */
  gaps: TrendGap[];
  windowStart: number;
  windowEnd: number;
  state: 'ready' | 'loading' | 'no-data' | 'unavailable';
}

export interface BuildActivenessInput {
  /** [timestamp, value] samples from the approved query. No scaling applied. */
  samples: readonly [number, string][];
  now: DateTime;
  windowHours?: number;
}

/**
 * The 24-hour activeness line. Gaps are measured from the data's own cadence
 * (median step × 4, floor five minutes) — the same rule as every other chart —
 * so the line breaks where the monitor was silent instead of bridging it.
 */
export function buildActivenessDay({
  samples,
  now,
  windowHours = 24,
}: BuildActivenessInput): ActivenessDay {
  const windowEnd = now.toSeconds();
  const windowStart = windowEnd - windowHours * 3600;

  const points: TrendPoint[] = samples
    .map(([at, value]) => ({ at, value: Number(value) }))
    .filter((point) => point.at >= windowStart && point.at <= windowEnd && Number.isFinite(point.value))
    .sort((a, b) => a.at - b.at);

  if (points.length === 0) {
    return { points: [], gaps: [], windowStart, windowEnd, state: 'no-data' };
  }

  const steps = points
    .slice(1)
    .map((point, i) => point.at - points[i]!.at)
    .sort((a, b) => a - b);
  const median = steps[Math.floor(steps.length / 2)] ?? 60;
  const limit = Math.max(median * 4, 300);

  const gaps: TrendGap[] = [];
  if (points[0]!.at - windowStart > limit) gaps.push({ from: windowStart, to: points[0]!.at });
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.at - points[i - 1]!.at > limit) {
      gaps.push({ from: points[i - 1]!.at, to: points[i]!.at });
    }
  }
  if (windowEnd - points.at(-1)!.at > limit) gaps.push({ from: points.at(-1)!.at, to: windowEnd });

  return { points, gaps, windowStart, windowEnd, state: 'ready' };
}

/** One rolling-family event at its exact moment. */
export interface RollingEvent {
  at: number;
  /** `rolling` or `partial-rolling` — the 103/104/105 family collapses to the
   * second, matching Review History's fixed expansion. */
  kind: 'rolling' | 'partial-rolling';
}

export interface RollingDayCount {
  key: string;
  weekday: string;
  /** `null` when the day was not observed — an empty slot, never a zero bar. */
  count: number | null;
  /** Last week's count for the marker. `null` draws no marker. */
  previousCount: number | null;
  isToday: boolean;
}

export interface BuildRollingWeekInput {
  /** This week's events, exact timestamps. */
  events: readonly RollingEvent[];
  /** Last week's events, exact timestamps — never derived by shifting dates. */
  previousEvents?: readonly RollingEvent[];
  /** Days the monitor reported, `yyyy-MM-dd` barn-day keys. Absent days are
   * unobserved and must not become zeros. */
  observedDays: ReadonlySet<string>;
  zone: string;
  now: DateTime;
  dayStartHour?: number;
}

export interface RollingWeek {
  days: RollingDayCount[];
  state: 'ready' | 'loading' | 'no-data' | 'unavailable';
}

/** Barn-day key for a moment, honouring the organization's chart start. */
function barnDayKey(at: number, zone: string, dayStartHour: number): string {
  return barnDayKeyForInstant(DateTime.fromSeconds(at, { zone }), dayStartHour);
}

export function buildRollingWeek({
  events,
  previousEvents = [],
  observedDays,
  zone,
  now,
  dayStartHour = 6,
}: BuildRollingWeekInput): RollingWeek {
  const todayKey = barnDayKey(now.toSeconds(), zone, dayStartHour);
  const todayDate = DateTime.fromISO(todayKey, { zone });

  const countsByDay = new Map<string, number>();
  for (const event of events) {
    const key = barnDayKey(event.at, zone, dayStartHour);
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }
  const previousByDay = new Map<string, number>();
  for (const event of previousEvents) {
    const key = barnDayKey(event.at, zone, dayStartHour);
    previousByDay.set(key, (previousByDay.get(key) ?? 0) + 1);
  }

  const days: RollingDayCount[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const day = todayDate.minus({ days: offset });
    const key = day.toFormat('yyyy-MM-dd');
    const previousKey = day.minus({ days: 7 }).toFormat('yyyy-MM-dd');
    const observed = observedDays.has(key);
    days.push({
      key,
      weekday: day.toFormat('ccccc'),
      // An unobserved day is null. A monitor that reported and saw no rolls is
      // a real zero. The shipping chart merges the two; this one never does.
      count: observed ? (countsByDay.get(key) ?? 0) : null,
      previousCount: previousByDay.get(previousKey) ?? null,
      isToday: offset === 0,
    });
  }

  const state: RollingWeek['state'] =
    days.every((day) => day.count === null) ? 'no-data' : 'ready';
  return { days, state };
}

/** "Rolled 3 times · 7:14 AM, 9:02 AM, 1:40 PM" — same shape as the visit
 * captions, so the wording is learned once. */
export function rollingCaption(events: readonly RollingEvent[], zone: string): string {
  if (events.length === 0) return 'No rolling detected';
  const at = (seconds: number) => DateTime.fromSeconds(seconds, { zone }).toFormat('h:mm a');
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const times = sorted.map((event) => at(event.at));
  const noun = sorted.length === 1 ? 'time' : 'times';
  if (sorted.length <= 3) return `Rolled ${sorted.length} ${noun} · ${times.join(', ')}`;
  return `Rolled ${sorted.length} times · first ${times[0]}, last ${times.at(-1)}`;
}
