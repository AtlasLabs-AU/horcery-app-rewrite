import { DateTime } from 'luxon';

import type { PrometheusRangeSeries } from '../occupancy-timeline';

/**
 * Deterministic lying-down fixtures.
 *
 * Shaped from production measured 2026-08-19 on sm-1275 / sm-1272 / sm-1212:
 * **2–4 bouts a day, 14–189 minutes daily, 16–31 bouts a week.** Design and
 * performance work should be judged against these magnitudes, not invented
 * extremes — the renderer spike nearly chose on a load 19× anything real.
 */

const STEP = 60;

function seriesFrom(
  now: DateTime,
  plan: readonly (readonly (readonly [number, number])[])[],
  { stopAfterDay }: { stopAfterDay?: number } = {},
): PrometheusRangeSeries[] {
  const start = now.minus({ days: plan.length - 1 }).startOf('day');
  const ranges: [number, number][] = [];
  plan.forEach((bouts, dayOffset) => {
    for (const [hour, minutes] of bouts) {
      const from = start.plus({ days: dayOffset, hours: hour });
      if (from > now) continue;
      ranges.push([from.toSeconds(), from.plus({ minutes }).toSeconds()]);
    }
  });

  const cutoff =
    stopAfterDay === undefined
      ? now.toSeconds()
      : start.plus({ days: stopAfterDay + 1 }).toSeconds();

  const values: [number, string][] = [];
  for (let t = start.toSeconds(); t <= Math.min(cutoff, now.toSeconds()); t += STEP) {
    values.push([t, ranges.some(([a, b]) => t >= a && t < b) ? '1' : '0']);
  }
  return [{ metric: { animal_type: 'horse', id: '0' }, values }];
}

/** A typical week: 2–4 bouts a day, mostly overnight. */
const TYPICAL_PLAN = [
  [[1, 42], [4, 35], [22, 28]],
  [[2, 55], [5, 20]],
  [[0, 38], [3, 47], [13, 22], [23, 31]],
  [[1, 25], [4, 60]],
  [[2, 44], [6, 18], [21, 36]],
  [[1, 51], [3, 29], [14, 19]],
  [[1, 48], [4, 33]],
] as const;

export function typicalWeek(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, TYPICAL_PLAN);
}

/** The monitor stopped reporting partway through — must never render as zeros. */
export function monitorWentOffline(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, TYPICAL_PLAN, { stopAfterDay: 3 });
}

/** Observed throughout, and the horse genuinely never lay down — a real zero. */
export function neverLayDown(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, TYPICAL_PLAN.map(() => []));
}

/** Nothing came back at all. */
export const noData: PrometheusRangeSeries[] = [];

/** A second horse with a genuinely different rhythm — fewer, longer rests. */
const SETTLED_PLAN = [
  [[0, 95], [4, 40]],
  [[1, 110]],
  [[23, 70], [3, 55]],
  [[0, 88], [5, 25]],
  [[1, 76], [4, 44]],
  [[2, 120]],
  [[0, 64], [3, 38]],
] as const;

export function settledSleeper(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, SETTLED_PLAN);
}

/** Turned out most of the day — in stall only in the early morning. */
const OUT_ALL_DAY_PLAN = [
  [[0, 40]], [[1, 35]], [[0, 52]], [[1, 28]], [[0, 44]], [[1, 30]], [[0, 36]],
] as const;

export function outMostOfDay(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, OUT_ALL_DAY_PLAN);
}

/** In-stall coverage for a horse kept in overnight — contains SETTLED_PLAN. */
const IN_STALL_OVERNIGHT = [
  [[20, 660]], [[20, 660]], [[20, 660]], [[20, 660]], [[20, 660]], [[20, 660]], [[20, 640]],
] as const;

export function inStallOvernight(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, IN_STALL_OVERNIGHT);
}

/** In-stall coverage for a horse that goes out to the paddock each day. */
const IN_STALL_WITH_TURNOUT = [
  [[18, 720]], [[18, 720]], [[18, 720]], [[18, 720]], [[18, 720]], [[18, 720]], [[18, 700]],
] as const;

export function inStallWithTurnout(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, IN_STALL_WITH_TURNOUT);
}
