import { DateTime } from 'luxon';

import type { PrometheusRangeSeries } from '../occupancy-timeline';

/**
 * Fixtures for the People in Stall **Behavior Tracker** charts.
 *
 * Separate from `people-in-stall.ts`, which feeds the seven-day occupancy
 * timeline. Same behaviour, different chart, different shape of question.
 *
 * Magnitudes are taken from the renderer spike's measurements rather than
 * invented: a busy real monitor logged **~350 human-presence events a week**,
 * which is roughly 25–30 visits on a busy day. The renderer spike nearly chose a
 * chart engine on a synthetic load 19× anything real, so these stay honest.
 */

const STEP = 90;
const DAY_START_HOUR = 6;

/**
 * Lays a plan of clock-hour visits into BARN days, not calendar days.
 *
 * The barn day runs 06:00 → 06:00, and the preview pins its clock to 05:00, so
 * "today" is yesterday morning through this morning. A plan indexed by calendar
 * day therefore puts the interesting day one slot out: the first version of
 * these fixtures showed a busy stall and a neglected stall as three identical
 * routine visits, because everything that made them different fell after the
 * barn day had already ended.
 *
 * So a plan entry `[7, 35]` means "07:00 for 35 minutes, on whichever calendar
 * date that hour belongs to inside this barn day" — 7 AM lands the same morning,
 * 2 AM lands after midnight. The last plan entry is always the day on screen.
 */
function seriesFrom(
  now: DateTime,
  plan: readonly (readonly (readonly [number, number])[])[],
  {
    gapAtHour,
    gapHours,
    missingDays,
  }: { gapAtHour?: number; gapHours?: number; missingDays?: readonly number[] } = {},
): PrometheusRangeSeries[] {
  const startOfToday = now.startOf('day').plus({ hours: DAY_START_HOUR });
  const currentBarnDay = now < startOfToday ? startOfToday.minus({ days: 1 }) : startOfToday;
  const firstBarnDay = currentBarnDay.minus({ days: plan.length - 1 });

  /** Where a clock hour sits inside a barn day that opens at 06:00. */
  const offsetOf = (hour: number) => (hour - DAY_START_HOUR + 24) % 24;

  const ranges: [number, number][] = [];
  plan.forEach((visits, dayOffset) => {
    const barnDay = firstBarnDay.plus({ days: dayOffset });
    for (const [hour, minutes] of visits) {
      const from = barnDay.plus({ hours: offsetOf(hour) });
      if (from > now) continue;
      ranges.push([from.toSeconds(), from.plus({ minutes }).toSeconds()]);
    }
  });

  // A monitor outage leaves NO samples at all for that stretch, which is what
  // makes it distinguishable from a stall nobody happened to visit.
  const gapFrom =
    gapAtHour === undefined ? null : currentBarnDay.plus({ hours: offsetOf(gapAtHour) });
  const gapTo = gapFrom && gapHours ? gapFrom.plus({ hours: gapHours }) : null;

  // Whole days the monitor was down. Emitting nothing at all is what makes them
  // distinguishable from days nobody happened to visit.
  const silent = (missingDays ?? []).map((dayOffset) => {
    const from = firstBarnDay.plus({ days: dayOffset });
    return [from.toSeconds(), from.plus({ days: 1 }).toSeconds()] as const;
  });

  const values: [number, string][] = [];
  for (let t = firstBarnDay.toSeconds(); t <= now.toSeconds(); t += STEP) {
    if (gapFrom && gapTo && t >= gapFrom.toSeconds() && t < gapTo.toSeconds()) continue;
    if (silent.some(([a, b]) => t >= a && t < b)) continue;
    values.push([t, ranges.some(([a, b]) => t >= a && t < b) ? '1' : '0']);
  }
  return [{ metric: { Event_Type: 'Human_Presence', stall_id: '4' }, values }];
}

/** A normal barn routine: morning feed, midday check, evening feed. */
const ROUTINE = [
  [[7, 35], [12, 20], [17, 40]],
  [[7, 30], [12, 25], [17, 35]],
  [[7, 40], [12, 15], [17, 45]],
  [[7, 32], [12, 22], [17, 38]],
  [[7, 28], [13, 18], [17, 42]],
  [[7, 36], [12, 24], [17, 36]],
  [[7, 34], [12, 21], [17, 39]],
] as const;

export function routineWeek(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, ROUTINE);
}

/**
 * A high-traffic stall EVERY day — a horse under treatment, or a busy yard.
 *
 * The pattern has to run the whole week, not just today. A fixture that differs
 * only on the current day makes the DAILY view tell a story and leaves the
 * WEEKLY view identical for every stall, because the weekly figure deliberately
 * excludes today as unfinished. That is exactly how the first version of these
 * fixtures shipped, and the weekly chart was unreadable as a result.
 *
 * 27 visits a day is the top of the measured range, and the case the caption
 * must survive without listing every time.
 */
const BUSY_DAY = Array.from({ length: 27 }, (_, i) => [6.5 + i * 0.55, 6] as const);
const BUSY = [
  BUSY_DAY,
  BUSY_DAY,
  BUSY_DAY,
  BUSY_DAY,
  BUSY_DAY,
  BUSY_DAY,
  BUSY_DAY,
] as const;

export function busyDay(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, BUSY);
}

/** Barely visited all week — one short check a day, and nothing else. */
const QUIET_DAY = [[8, 12]] as const;
const NEGLECTED = [
  QUIET_DAY,
  QUIET_DAY,
  QUIET_DAY,
  QUIET_DAY,
  QUIET_DAY,
  QUIET_DAY,
  QUIET_DAY,
] as const;

export function barelyVisited(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, NEGLECTED);
}

/**
 * An unreliable monitor: down for two whole days earlier in the week, and again
 * over lunch today. The weekly view must average only the days it could see and
 * say so; the daily view must show the gap rather than counting it as quiet.
 */
export function monitorGapMidday(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, ROUTINE, { gapAtHour: 11.5, gapHours: 4, missingDays: [2, 3] });
}

/** Nothing came back at all. */
export const noData: PrometheusRangeSeries[] = [];
