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

function seriesFrom(
  now: DateTime,
  plan: readonly (readonly (readonly [number, number])[])[],
  { gapAfterHour, gapHours }: { gapAfterHour?: number; gapHours?: number } = {},
): PrometheusRangeSeries[] {
  const start = now.minus({ days: plan.length - 1 }).startOf('day');
  const ranges: [number, number][] = [];
  plan.forEach((visits, dayOffset) => {
    for (const [hour, minutes] of visits) {
      const from = start.plus({ days: dayOffset, hours: hour });
      if (from > now) continue;
      ranges.push([from.toSeconds(), from.plus({ minutes }).toSeconds()]);
    }
  });

  // A monitor outage on the final day leaves NO samples at all for that stretch,
  // which is what makes it distinguishable from a quiet period.
  const gapFrom =
    gapAfterHour === undefined ? null : now.startOf('day').plus({ hours: gapAfterHour });
  const gapTo = gapFrom && gapHours ? gapFrom.plus({ hours: gapHours }) : null;

  const values: [number, string][] = [];
  for (let t = start.toSeconds(); t <= now.toSeconds(); t += STEP) {
    if (gapFrom && gapTo && t >= gapFrom.toSeconds() && t < gapTo.toSeconds()) continue;
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
 * A high-traffic stall — a horse under treatment, or a busy yard. 27 visits on
 * the last day, which is the top of the measured range and the case the caption
 * must survive without listing every time.
 */
const BUSY_DAY = Array.from({ length: 27 }, (_, i) => [6 + i * 0.6, 6] as const);
const BUSY = [
  ROUTINE[0],
  ROUTINE[1],
  ROUTINE[2],
  ROUTINE[3],
  ROUTINE[4],
  ROUTINE[5],
  BUSY_DAY,
] as const;

export function busyDay(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, BUSY);
}

/** Barely visited: one short visit, then nothing. The case a badge is for. */
const NEGLECTED = [
  ROUTINE[0],
  ROUTINE[1],
  ROUTINE[2],
  ROUTINE[3],
  ROUTINE[4],
  ROUTINE[5],
  [[8, 12]],
] as const;

export function barelyVisited(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, NEGLECTED);
}

/** The monitor stopped reporting mid-morning and came back mid-afternoon. */
export function monitorGapMidday(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, ROUTINE, { gapAfterHour: 11.5, gapHours: 4 });
}

/** Nothing came back at all. */
export const noData: PrometheusRangeSeries[] = [];
