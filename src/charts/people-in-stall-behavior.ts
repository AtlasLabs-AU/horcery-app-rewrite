import { DateTime } from 'luxon';

import {
  buildLyingDownWeek,
  buildLyingDownWeekly,
  deviationPercentOf,
  hasEnoughHistory,
  lyingDownVerdict,
  usualByNow,
  usualWindowObserved,
  type LyingDownWeek,
  type LyingDownWeeklySummary,
  type UsualCurvePoint,
  type Verdict,
} from './lying-down';
import type { PrometheusRangeSeries } from './occupancy-timeline';

/**
 * People in Stall — the Behavior Tracker daily and weekly charts.
 *
 * NOT the seven-day occupancy timeline (`PEOPLE_IN_STALL.md`, `occupancy-*`).
 * That chart answers "when was someone in the stall this week, and was the horse
 * there too". This one answers Inakshi's question, 2026-08-19:
 *
 *   "How much time did people spend inside a stall?"
 *
 * Three product decisions it is built on (register, "Product decisions — People
 * in Stall"):
 *
 * 1. **Occupied time, not person-time.** Two people for ten minutes is ten
 *    minutes. The signal is binary presence, so this is what it measures anyway
 *    — but it means the figure must never be described as a headcount.
 * 2. **The stall is the entity.** People visit a stall; the horse living in it
 *    can change. Measured per stall, shown on whichever view is open.
 * 3. **The Lying Down badge system, unchanged.** Own-normal comparison, no
 *    verdict without history, ochre for deviation, missing data never zero.
 *
 * ## Why this module is thin
 *
 * Both behaviours are the same shape of measurement: a binary yes/no signal
 * sampled over time, cut into barn days, grouped into stretches, totalled and
 * compared against the entity's own normal. `lying-down.ts` already does all of
 * that and is tested for it, so this module reuses it rather than restating it.
 * What it adds is only what genuinely differs:
 *
 * - **Vocabulary.** A stretch of presence is a *visit*, not a bout, and the
 *   count of visits is a fact the customer reads directly.
 * - **No observability denominator.** Lying Down divides by in-stall time,
 *   because a horse out at pasture cannot be seen lying down. Human presence has
 *   no equivalent: the monitor either reported or it did not.
 * - **The caption**, which is this chart's own presentation rule.
 *
 * Copying the domain instead would have meant two places to fix the next
 * missing-data bug.
 */

export interface Visit {
  /** Epoch seconds. */
  enter: number;
  exit: number;
}

export interface PeopleInStallDay {
  /** Total time with at least one person present. `null` when unobserved. */
  totalSeconds: number | null;
  visits: Visit[];
  /** Stretches the monitor did not report — drawn as gaps, never as zero. */
  unobserved: Visit[];
}

export interface PeopleInStallWeek {
  /** The shared week model: barn days, today, cumulative line. */
  week: LyingDownWeek;
  today: PeopleInStallDay | null;
  /** How much time people had usually spent by this point today. */
  usualByNowSeconds: number | null;
  verdict: Verdict;
  zone: string;
}

export interface BuildPeopleInStallInput {
  /** `response.data.result` from the approved human-presence query. */
  result: PrometheusRangeSeries[];
  selectedDate: string;
  zone: string;
  dayStartHour?: number;
  now: DateTime;
  /** This stall's usual cumulative progress. From Data Science; never derived. */
  usualCurve?: readonly UsualCurvePoint[];
  /** When the stall monitor was installed. Gates the verdict. */
  stallCreatedAt?: string | null;
  thresholdPercent?: number;
}

/** The daily view: today's people-time against this stall's own normal. */
export function buildPeopleInStallWeek({
  result,
  selectedDate,
  zone,
  dayStartHour,
  now,
  usualCurve,
  stallCreatedAt,
  thresholdPercent,
}: BuildPeopleInStallInput): PeopleInStallWeek {
  // No `inStallResult`: a stall monitor's view of the doorway does not depend on
  // where the horse is, so this behaviour has no coverage denominator.
  const week = buildLyingDownWeek({ result, selectedDate, zone, dayStartHour, now });

  const day = week.today;
  const today: PeopleInStallDay | null = day
    ? {
        totalSeconds: day.totalSeconds,
        visits: day.bouts.map((bout) => ({ enter: bout.enter, exit: bout.exit })),
        unobserved: unobservedStretches(result, day.start, Math.min(day.nextMidnight, now.toSeconds())),
      }
    : null;

  const usualByNowSeconds = usualByNow(week, usualCurve as UsualCurvePoint[] | undefined);
  const enoughHistory = hasEnoughHistory(stallCreatedAt, 'daily', now);

  return {
    week,
    today,
    usualByNowSeconds,
    zone,
    // Same rule as Lying Down: no verdict without the history to back one, and
    // an absence of observations is never "usual".
    //
    // A partly observed day is included in that, for the same reason: its total
    // is an undercount, so judging it against a whole day's normal compares two
    // different things. The row would otherwise say "the monitor was offline"
    // and badge the day "Usual" in the same breath.
    verdict:
      today?.totalSeconds == null
        ? 'no-data'
        : today.unobserved.length > 0
          ? 'incomplete'
          : // The usual line comes from an upstream average over the last seven
            // days. We cannot see its divisor, but we DO fetch those same seven
            // days to draw the chart — so a window with holes in it means a
            // usual we have reason to distrust, and an untrustworthy normal is
            // not something to judge a horse against.
            !usualWindowObserved(week)
            ? 'incomplete'
            : !enoughHistory
            ? 'unknown'
            : lyingDownVerdict({
                deviationPercent: deviationPercentOf(today.totalSeconds, usualByNowSeconds),
                thresholdPercent,
                valueSeconds: today.totalSeconds,
                usualSeconds: usualByNowSeconds,
              }),
  };
}

/** The weekly view. Identical shape to Lying Down's, gated on four weeks. */
export function buildPeopleInStallWeekly(
  week: LyingDownWeek,
  {
    usualSecondsByWeekday,
    stallCreatedAt,
    now,
    thresholdPercent,
  }: {
    usualSecondsByWeekday?: Partial<Record<number, number>>;
    stallCreatedAt?: string | null;
    now: DateTime;
    thresholdPercent?: number;
  },
): LyingDownWeeklySummary {
  const summary = buildLyingDownWeekly(week, { usualSecondsByWeekday, thresholdPercent });
  if (hasEnoughHistory(stallCreatedAt, 'weekly', now)) return summary;
  return { ...summary, verdict: 'unknown' };
}

/**
 * Stretches of today the monitor did not report.
 *
 * Drawn as grey gaps rather than as quiet time, because "nobody visited" and "we
 * were not watching" are different statements and only one of them is a fact.
 *
 * Derived from the sample timestamps rather than from the week model's coverage
 * flag, which distinguishes only "nothing at all" from "stopped reporting" — it
 * cannot see a monitor that dropped out at 11:40 and came back at 15:30, which
 * is the commonest real outage and the one that most distorts a day's total.
 *
 * The cadence is measured from the data rather than assumed: these queries have
 * shipped at 30 s, 60 s and 90 s steps, so a hardcoded step would silently stop
 * detecting gaps the day someone tuned the query. A gap counts as an outage at
 * four times the usual spacing, and never below five minutes — Prometheus drops
 * the odd scrape under load, and a chart that cried "offline" at every missed
 * sample would be ignored within a week.
 */
function unobservedStretches(
  result: PrometheusRangeSeries[],
  from: number,
  to: number,
): Visit[] {
  const stamps = [
    ...new Set(
      result.flatMap((series) =>
        series.values.map(([at]) => at).filter((at) => at >= from && at <= to),
      ),
    ),
  ].sort((a, b) => a - b);

  if (stamps.length === 0) return to > from ? [{ enter: from, exit: to }] : [];

  const steps = stamps.slice(1).map((at, i) => at - stamps[i]!).sort((a, b) => a - b);
  const median = steps[Math.floor(steps.length / 2)] ?? 60;
  const limit = Math.max(median * 4, 300);

  const gaps: Visit[] = [];
  if (stamps[0]! - from > limit) gaps.push({ enter: from, exit: stamps[0]! });
  for (let i = 1; i < stamps.length; i++) {
    if (stamps[i]! - stamps[i - 1]! > limit) {
      gaps.push({ enter: stamps[i - 1]!, exit: stamps[i]! });
    }
  }
  const last = stamps.at(-1)!;
  if (to - last > limit) gaps.push({ enter: last, exit: to });
  return gaps;
}

/** Above this many visits the caption stops listing them and summarises. */
export const MAX_LISTED_VISITS = 3;

/**
 * The caption under the visits strip.
 *
 * Real clock times, never dayparts (Inakshi, 2026-08-19). "Morning" would mean
 * inventing the hour at which morning ends, which is unapproved meaning; 7:05 AM
 * is a fact the query already carries. And a barn manager asking "did anyone do
 * the evening check?" is answered by 5:15 PM, not by the word "evening".
 *
 * Real monitors log up to ~27 visits in a busy day (measured 2026-08-19), so
 * listing every time is not an option: past three, the caption gives the count
 * with the first and last, and the strip above carries the distribution.
 */
export function visitsCaption(day: PeopleInStallDay | null, zone: string): string {
  if (!day || day.totalSeconds === null) return "We can't tell whether anyone visited";

  const visits = day.visits;
  if (visits.length === 0) return 'No visits recorded';

  const at = (seconds: number) =>
    DateTime.fromSeconds(seconds, { zone }).toFormat('h:mm a');

  if (visits.length <= MAX_LISTED_VISITS) {
    const times = visits.map((visit) => at(visit.enter)).join(', ');
    const noun = visits.length === 1 ? 'visit' : 'visits';
    return `${visits.length} ${noun} · ${times}`;
  }

  return `${visits.length} visits · first ${at(visits[0]!.enter)}, last ${at(
    visits.at(-1)!.enter,
  )}`;
}

/**
 * The caption when part of the day went unobserved, which replaces the visit
 * list: a count over a day we only half watched is not comparable with a whole
 * one, and saying so is more useful than a number that looks complete.
 */
export function outageCaption(day: PeopleInStallDay | null, zone: string): string | null {
  if (!day || day.unobserved.length === 0) return null;
  const gap = day.unobserved[0]!;
  const at = (seconds: number) => DateTime.fromSeconds(seconds, { zone }).toFormat('h:mm a');
  return `Monitor offline ${at(gap.enter)} – ${at(gap.exit)} — visits then are unknown`;
}
