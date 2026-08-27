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
 * Horse in Stall — the Behavior Tracker daily and weekly charts.
 *
 * The customer question: **how long was the horse in its stall, and when was it
 * out?** The shipping app calls this behaviour `stallOccupancy` internally and
 * presents it as "Horse In Stall"; it draws only the total, which answers the
 * first half and leaves the second half to guesswork.
 *
 * ## Why the caption talks about absences
 *
 * This chart is the inverse of People in Stall, and the wording has to invert
 * with it (Inakshi, 2026-08-20).
 *
 * A person in a stall is an *event*: they were not there, then they were, and
 * the notable fact is that they came. So that chart lists presences.
 *
 * A horse in its stall is the *resting state*. It is in almost all day, every
 * day. Listing "in from 1:05 PM to 8:30 AM" tells a customer nothing they did
 * not assume. The notable fact — and the answer to the only question a low
 * total provokes, "why is today short?" — is when the horse was OUT. Turnout,
 * a ride, the farrier. So this chart captions the gaps.
 *
 * ## Why absences are only computed for fully observed days
 *
 * A gap in the data has two possible meanings: the horse was out, or nobody was
 * watching. Those must never be merged — that is the same failure as reading
 * missing data as zero, wearing different clothes. Rather than try to attribute
 * each gap, a day with ANY unobserved stretch reports no absence detail at all
 * and says it is partly recorded. That matches the rule already agreed for the
 * weekly panel and keeps the honest case simple.
 *
 * ## Why this module is thin
 *
 * Same shape of measurement as Lying Down and People in Stall: a binary signal
 * sampled over time, cut into barn days, grouped into stretches, totalled,
 * compared against the entity's own normal. `lying-down.ts` does all of that
 * and is tested for it. Duplicating it would mean three places to fix the next
 * missing-data bug.
 */

/** A stretch the horse was out of the stall. `back` is null while still out. */
export interface Absence {
  out: number;
  back: number | null;
}

export interface HorseInStallDay {
  /** Seconds in the stall. `null` when the day was not observed at all. */
  totalSeconds: number | null;
  /** Stretches the horse was in the stall — the filled part of the strip. */
  inStall: { enter: number; exit: number }[];
  /** Confirmed absences. Empty when the day is only partly recorded. */
  absences: Absence[];
  /** Stretches the monitor did not report — drawn apart from being out. */
  unobserved: { enter: number; exit: number }[];
  /** True when any stretch of the day went unreported. */
  partlyRecorded: boolean;
}

export interface HorseInStallWeek {
  week: LyingDownWeek;
  today: HorseInStallDay | null;
  /** How long the horse had usually been in by this point in the day. */
  usualByNowSeconds: number | null;
  verdict: Verdict;
  zone: string;
}

export interface BuildHorseInStallInput {
  /** `response.data.result` from the approved `horse_in_stall` query. */
  result: PrometheusRangeSeries[];
  selectedDate: string;
  zone: string;
  dayStartHour?: number;
  now: DateTime;
  /** This entity's usual cumulative progress. From Data Science; never derived. */
  usualCurve?: readonly UsualCurvePoint[];
  /**
   * When the entity being judged was created — the STALL in stall view, the
   * HORSE in horse view. The shipping app passes the stall's date in both,
   * which lets a horse assigned yesterday inherit an old stall's history.
   */
  entityCreatedAt?: string | null;
  thresholdPercent?: number;
}

/**
 * Ignore gaps shorter than this before calling the horse "out".
 *
 * A missed scrape or a moment stood in the doorway is not turnout, and a
 * caption that announced one would be noise the first time a customer read it.
 */
export const MIN_ABSENCE_SECONDS = 300;

/** Above this many absences the caption counts them instead of listing them. */
export const MAX_LISTED_ABSENCES = 2;

export function buildHorseInStallWeek({
  result,
  selectedDate,
  zone,
  dayStartHour,
  now,
  usualCurve,
  entityCreatedAt,
  thresholdPercent,
}: BuildHorseInStallInput): HorseInStallWeek {
  const week = buildLyingDownWeek({ result, selectedDate, zone, dayStartHour, now });

  const day = week.today;
  const upTo = day ? Math.min(day.nextMidnight, now.toSeconds()) : 0;
  const unobserved = day ? gapsIn(result, day.start, upTo) : [];

  const today: HorseInStallDay | null = day
    ? {
        totalSeconds: day.totalSeconds,
        inStall: day.bouts.map((bout) => ({ enter: bout.enter, exit: bout.exit })),
        // Suppressed on a partly recorded day: we cannot tell an absence from
        // an outage, and guessing is the failure this chart exists to avoid.
        absences:
          day.totalSeconds === null || unobserved.length > 0
            ? []
            : absencesFrom(
                day.bouts.map((bout) => ({ enter: bout.enter, exit: bout.exit })),
                day.start,
                upTo,
              ),
        unobserved,
        partlyRecorded: unobserved.length > 0,
      }
    : null;

  const usualByNowSeconds = usualByNow(week, usualCurve as UsualCurvePoint[] | undefined);
  const enoughHistory = hasEnoughHistory(entityCreatedAt, 'daily', now);

  return {
    week,
    today,
    usualByNowSeconds,
    zone,
    // A partly recorded day is an UNDERCOUNT, so comparing it against a whole
    // day's normal is comparing two different things. Left in, the row said
    // "Some readings are missing" and badged the same day "Usual" — a reassuring
    // verdict drawn from data we admitted was incomplete, which is the failure
    // this chart is meant to close (seen on device, 2026-08-20).
    verdict:
      today?.totalSeconds == null
        ? 'no-data'
        : today.partlyRecorded
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
export function buildHorseInStallWeekly(
  week: LyingDownWeek,
  {
    usualSecondsByWeekday,
    entityCreatedAt,
    now,
    thresholdPercent,
  }: {
    usualSecondsByWeekday?: Partial<Record<number, number>>;
    entityCreatedAt?: string | null;
    now: DateTime;
    thresholdPercent?: number;
  },
): LyingDownWeeklySummary {
  const summary = buildLyingDownWeekly(week, { usualSecondsByWeekday, thresholdPercent });
  if (hasEnoughHistory(entityCreatedAt, 'weekly', now)) return summary;
  return { ...summary, verdict: 'unknown' };
}

/**
 * The gaps between in-stall stretches, which is where the horse was out.
 *
 * Bounded by the barn day at one end and by `upTo` at the other, so a horse out
 * right now yields an open absence (`back: null`) rather than one that appears
 * to have ended at the current moment.
 */
export function absencesFrom(
  bouts: readonly { enter: number; exit: number }[],
  dayStart: number,
  upTo: number,
): Absence[] {
  if (upTo <= dayStart) return [];
  if (bouts.length === 0) return [{ out: dayStart, back: null }];

  const sorted = [...bouts].sort((a, b) => a.enter - b.enter);
  const absences: Absence[] = [];

  if (sorted[0]!.enter - dayStart >= MIN_ABSENCE_SECONDS) {
    absences.push({ out: dayStart, back: sorted[0]!.enter });
  }
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]!.enter - sorted[i - 1]!.exit;
    if (gap >= MIN_ABSENCE_SECONDS) {
      absences.push({ out: sorted[i - 1]!.exit, back: sorted[i]!.enter });
    }
  }
  const lastExit = sorted.at(-1)!.exit;
  if (upTo - lastExit >= MIN_ABSENCE_SECONDS) absences.push({ out: lastExit, back: null });

  return absences;
}

/**
 * The caption under the in/out strip, in the absence-first wording Inakshi chose
 * on 2026-08-20.
 *
 * Every branch answers the question a customer actually brings to this chart —
 * "is that total normal, and if not, why" — rather than restating the bar.
 */
export function absencesCaption(day: HorseInStallDay | null, zone: string): string {
  if (!day || day.totalSeconds === null) return "We can't tell where the horse was";
  if (day.partlyRecorded) return 'Partly recorded — time out is unknown';

  const at = (seconds: number) => DateTime.fromSeconds(seconds, { zone }).toFormat('h:mm a');
  const absences = day.absences;

  if (absences.length === 0) return 'In all day';

  // Out and not back: the one case where a low total is not yet a finished fact.
  const open = absences.at(-1)!.back === null;
  if (absences.length === 1 && open) {
    return day.totalSeconds === 0
      ? 'Out all day'
      : `Out since ${at(absences[0]!.out)}`;
  }

  if (absences.length <= MAX_LISTED_ABSENCES) {
    const parts = absences.map((absence) =>
      absence.back === null
        ? `since ${at(absence.out)}`
        : `${at(absence.out)} – ${at(absence.back)}`,
    );
    return `Out ${parts.join(' and ')}`;
  }

  return `Out ${absences.length} times · first ${at(absences[0]!.out)}, last ${at(
    absences.at(-1)!.out,
  )}`;
}

/**
 * Stretches between `from` and `to` the monitor did not report.
 *
 * The cadence is measured from the data rather than assumed: these queries have
 * shipped at 30 s, 60 s and 90 s steps, so a hardcoded step would silently stop
 * detecting gaps the day someone tuned the query. A gap counts as an outage at
 * four times the usual spacing — Prometheus drops the odd scrape under load, and
 * a chart that cried "offline" at every missed sample would be ignored within a
 * week.
 */
function gapsIn(
  result: PrometheusRangeSeries[],
  from: number,
  to: number,
): { enter: number; exit: number }[] {
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
  const limit = Math.max(median * 4, MIN_ABSENCE_SECONDS);

  const gaps: { enter: number; exit: number }[] = [];
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
