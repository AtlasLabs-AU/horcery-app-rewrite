import { DateTime } from 'luxon';

import type { PrometheusRangeSeries } from '../occupancy-timeline';

/**
 * Fixtures for the Horse in Stall **Behavior Tracker** charts.
 *
 * These are the inverse of the People in Stall fixtures in both senses. There, a
 * plan entry is a visit and the signal is 0 between them. Here the horse is IN
 * by default and a plan entry is a stretch it was OUT — turnout, a ride, the
 * farrier — with the signal 0 only then.
 *
 * Magnitudes come from the measured monitors rather than invention: **7.6–22.6
 * hours in stall per day**, and **36–48 occupancy transitions a week**, which is
 * roughly two to three separate absences on a typical day. A fixture that
 * invented ten daily turnouts would make the caption's counting branch look
 * routine when it is in fact the unusual case.
 */

const STEP = 90;
const DAY_START_HOUR = 6;

/**
 * Lays a plan of clock-hour ABSENCES into BARN days, not calendar days.
 *
 * The barn day runs 06:00 → 06:00 and the preview pins its clock to 05:00, so
 * "today" is yesterday morning through this morning. A plan indexed by calendar
 * day puts the interesting day one slot out — the mistake that made the first
 * People in Stall fixtures show three identical stalls.
 *
 * A plan entry `[8.5, 4.5]` means "out at 08:30 for four and a half hours, on
 * whichever calendar date that hour belongs to inside this barn day".
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

  const out: [number, number][] = [];
  plan.forEach((absences, dayOffset) => {
    const barnDay = firstBarnDay.plus({ days: dayOffset });
    for (const [hour, hours] of absences) {
      const from = barnDay.plus({ hours: offsetOf(hour) });
      if (from > now) continue;
      out.push([from.toSeconds(), from.plus({ hours }).toSeconds()]);
    }
  });

  // An outage leaves NO samples at all, which is what makes it distinguishable
  // from the horse being out — the whole point of this chart's caption rules.
  const gapFrom =
    gapAtHour === undefined ? null : currentBarnDay.plus({ hours: offsetOf(gapAtHour) });
  const gapTo = gapFrom && gapHours ? gapFrom.plus({ hours: gapHours }) : null;

  const silent = (missingDays ?? []).map((dayOffset) => {
    const from = firstBarnDay.plus({ days: dayOffset });
    return [from.toSeconds(), from.plus({ days: 1 }).toSeconds()] as const;
  });

  const values: [number, string][] = [];
  for (let t = firstBarnDay.toSeconds(); t <= now.toSeconds(); t += STEP) {
    if (gapFrom && gapTo && t >= gapFrom.toSeconds() && t < gapTo.toSeconds()) continue;
    if (silent.some(([a, b]) => t >= a && t < b)) continue;
    values.push([t, out.some(([a, b]) => t >= a && t < b) ? '0' : '1']);
  }
  return [{ metric: { animal_type: 'horse', stall_id: '4' }, values }];
}

/** Turnout after morning feed, back before evening feed. About 19 h in. */
const ROUTINE = [
  [[8.5, 4.5]],
  [[8.5, 4.75]],
  [[8.75, 4.25]],
  [[8.5, 4.5]],
  [[8.25, 5]],
  [[8.5, 4.5]],
  [[8.5, 4.5]],
] as const;

export function routineTurnout(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, ROUTINE);
}

/**
 * Out far longer than usual, every day — summer turnout, or a horse at grass.
 *
 * The pattern runs the whole week rather than only today. A fixture that differs
 * only on the current day leaves the WEEKLY view identical for every row,
 * because the weekly figure deliberately excludes today as unfinished — exactly
 * how the People in Stall fixtures first shipped, which made that chart
 * unreadable.
 */
const LONG_DAY = [[7, 12]] as const;
const LONG_TURNOUT = [
  LONG_DAY,
  LONG_DAY,
  LONG_DAY,
  LONG_DAY,
  LONG_DAY,
  LONG_DAY,
  LONG_DAY,
] as const;

export function longTurnout(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, LONG_TURNOUT);
}

/**
 * Never left the stall — box rest, or a week of bad weather.
 *
 * Exercises the `In all day` caption, and the case where the strip is a solid
 * unbroken run. A customer should be able to tell this from a monitor stuck
 * reporting 1, which is why the row still shows its observation state.
 */
export function inAllDay(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, [[], [], [], [], [], [], []]);
}

/**
 * Several separate absences in a day — in and out for schooling, farrier, vet.
 *
 * Three is past the point where the caption lists them, so this is the fixture
 * that proves the counting branch reads well rather than merely compiling.
 */
const FRAGMENTED_DAY = [
  [7.5, 1.5],
  [10, 2],
  [14, 1.5],
  [17, 1],
] as const;
const FRAGMENTED = [
  FRAGMENTED_DAY,
  FRAGMENTED_DAY,
  FRAGMENTED_DAY,
  FRAGMENTED_DAY,
  FRAGMENTED_DAY,
  FRAGMENTED_DAY,
  FRAGMENTED_DAY,
] as const;

export function fragmentedDay(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, FRAGMENTED);
}

/**
 * The monitor dropped out from late morning, and was down for two whole days.
 *
 * The single most important fixture on this chart. A four-hour hole in the data
 * looks exactly like four hours of turnout, and the shipping app would present
 * the resulting short day as a fact — so this is the case where the row must
 * refuse to name any absence at all and say it is partly recorded.
 */
export function monitorGapMidday(now: DateTime): PrometheusRangeSeries[] {
  return seriesFrom(now, ROUTINE, { gapAtHour: 11.5, gapHours: 4, missingDays: [2, 3] });
}

/** Nothing came back at all — never drawn as a horse that stayed out. */
export function noData(): PrometheusRangeSeries[] {
  return [];
}
