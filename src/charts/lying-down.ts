import { DateTime } from 'luxon';

import {
  buildOccupancyTimeline,
  type EpochSeconds,
  type OccupancyInterval,
  type PrometheusRangeSeries,
} from './occupancy-timeline';

/**
 * Lying Down — domain model for the For You card.
 *
 * The customer question this chart exists to answer (chart engineering standard
 * §1), in one sentence:
 *
 *   "How much has my horse lain down today, when, and is that normal for it?"
 *
 * The "when" is deliberate and is not decoration. Real production data
 * (sm-1275/1272/1212, week to 2026-08-19) shows a horse lies down in only
 * **2–4 separate bouts a day**, totalling 14–189 minutes. A daily total alone
 * cannot distinguish three calm rests from a horse that lies down and struggles
 * up eight times in an hour — and the second is textbook colic. Bouts are cheap
 * to carry at this volume and they preserve that signal, so the model exposes
 * them rather than collapsing to a sum.
 *
 * Boundary (standard §2): this module performs arithmetic on already-approved
 * observations — cutting samples into barn days, grouping them into bouts,
 * summing durations. It does **not** decide whether a day is normal. That is a
 * behavioural judgement Data Science owns, so `comparison` is an *input*.
 * Nothing here invents or tunes a threshold.
 */

/** One continuous stretch of the horse being down. */
export type LyingDownBout = OccupancyInterval;

/**
 * Why a day carries no lying-down time. `no-observations` and `none-detected`
 * are different statements and must never be merged (standard §7): one means we
 * do not know, the other means we know the horse stayed up.
 */
export type DayCoverage = 'observed' | 'no-observations' | 'partial';

/** A point on the cumulative daily line: seconds down, by this moment. */
export interface CumulativePoint {
  at: EpochSeconds;
  /** Running total of lying-down seconds since the barn day began. */
  totalSeconds: number;
}

export interface LyingDownDay {
  /** `yyyy-MM-dd` in the organization's zone. Stable key, never shown. */
  key: string;
  /** Barn-day bounds; `end` is clamped to now for a day still in progress. */
  start: EpochSeconds;
  end: EpochSeconds;
  /**
   * The following barn midnight, never clamped. A "when today" track is drawn
   * against the whole day so the bouts sit at their true clock positions and
   * the unelapsed part of the day stays visibly empty rather than being
   * stretched to fill the width.
   */
  nextMidnight: EpochSeconds;
  isToday: boolean;
  /**
   * Whether observations exist for this day at all. A day with
   * `no-observations` MUST NOT be drawn as a zero bar — see `totalSeconds`.
   */
  coverage: DayCoverage;
  /**
   * Total time down. `null` when `coverage` is `no-observations`: the horse may
   * have lain down all day and the monitor may simply have been offline.
   * Rendering `null` as 0 is the single most damaging mistake this chart can
   * make, because "your horse never lay down" is itself a welfare alarm.
   */
  totalSeconds: number | null;
  /** Individual bouts, oldest first. Empty when nothing was detected. */
  bouts: LyingDownBout[];
  /**
   * Time the horse was IN THE STALL, and therefore observable at all.
   *
   * Lying-down time is meaningless without it: a horse turned out all day
   * cannot be seen lying down, and rendering that as "never lay down" is a
   * welfare alarm rather than a fact. Measured 2026-08-19 across three real
   * monitors, in-stall time ranged 7.6 h to 22.6 h in a single day — so this
   * denominator moves far more than the numerator does.
   */
  inStallSeconds: number | null;
  /** When the horse was in the stall — drawn as the strip under the chart. */
  inStallIntervals: LyingDownBout[];
}

/**
 * A comparison supplied by the backend/Data Science. The phone renders this; it
 * does not compute it, and it does not decide the tolerance that separates
 * "usual" from "unusual".
 *
 * Recorded because it bit us: a fixed ±30-minute tolerance was proposed, but
 * one real horse ranged 14–171 minutes inside a single week, so that rule would
 * mark almost every day unusual. Whatever tolerance ships has to come from the
 * horse's own variability, decided upstream.
 */
export interface LyingDownComparison {
  /** Typical accumulated time by this point in the barn day, in seconds. */
  typicalByNowSeconds: number;
  /** Upstream's verdict. `insufficient-history` is not "normal". */
  verdict: 'usual' | 'more-than-usual' | 'less-than-usual' | 'insufficient-history';
  /** How many prior days the verdict rests on, for honest presentation. */
  basisDays: number;
}

/** The eight distinguishable states required by the standard (§7). */
export type LyingDownState =
  | 'ready'
  | 'loading'
  | 'refreshing'
  | 'no-data'
  | 'out-of-stall'
  | 'stale'
  | 'partial'
  | 'unavailable'
  | 'unsupported';

export interface LyingDownWeek {
  /** Hour the barn day starts, echoed so a renderer can label its axis. */
  dayStartHour: number;
  /** Today's cumulative line, oldest first. Empty when today has no data. */
  cumulative: CumulativePoint[];
  state: LyingDownState;
  zone: string;
  /** Oldest first, matching the occupancy chart's row order. */
  days: LyingDownDay[];
  /** Today's row, for the headline. `null` if today is not in range. */
  today: LyingDownDay | null;
  /** Supplied upstream; absent when the backend could not produce one. */
  comparison?: LyingDownComparison;
  /** Total bouts across the window — the load a renderer must draw. */
  boutCount: number;
}

export interface BuildLyingDownWeekInput {
  /** `response.data.result` from the approved lying-down query. */
  result: PrometheusRangeSeries[];
  /** `response.data.result` from the approved in-stall query (`dailyHorseInStall`). */
  inStallResult?: PrometheusRangeSeries[];
  /** Hour the barn day begins. Horcery's queries use 6; see `dayStartHour`. */
  dayStartHour?: number;
  /** Last day shown, as a calendar date `yyyy-MM-dd`, read in `zone`. */
  selectedDate: string;
  /** IANA zone of the ORGANIZATION, never the phone. */
  zone: string;
  days?: number;
  now: DateTime;
  /** Supplied by the backend. Never derived here. */
  comparison?: LyingDownComparison;
  /** Set when the horse is not in the stall for the current period. */
  outOfStall?: boolean;
  state?: LyingDownState;
}

export const DEFAULT_DAYS = 7;

/**
 * The approved detection query returns a rounded 0 or 1, so anything at or
 * above a half is "down". This is a decoding constant for a binary signal, not
 * a behavioural threshold.
 */
const DOWN = 0.5;

function totalOf(bouts: readonly LyingDownBout[]): number {
  return bouts.reduce((sum, bout) => sum + Math.max(0, bout.exit - bout.enter), 0);
}

/**
 * True when a day claims more lying-down time than in-stall time.
 *
 * The horse can only be seen lying down while it is in the stall, so this is
 * physically impossible and always means the two inputs disagree — different
 * windows, different rounding, or one query lagging the other. It surfaced in
 * the preview build with 1 h 42 min lying against 1 h 20 min in stall, rendered
 * on screen without complaint.
 *
 * The denominator is what the customer would doubt, so the chart withholds it
 * rather than printing a figure that contradicts the number above it.
 */
export function inStallDisagrees(day: LyingDownDay): boolean {
  if (day.inStallSeconds === null || day.totalSeconds === null) return false;
  // A minute of slack absorbs sampling-step differences between the queries.
  return day.totalSeconds > day.inStallSeconds + 60;
}

/** Barn day for Horcery: horses rest overnight, so 6 AM keeps a night whole. */
export const DEFAULT_DAY_START_HOUR = 6;

/** Running total through the day, sampled at each bout edge. */
function cumulativeFor(day: LyingDownDay): CumulativePoint[] {
  if (day.totalSeconds === null) return [];
  const points: CumulativePoint[] = [{ at: day.start, totalSeconds: 0 }];
  let running = 0;
  for (const bout of day.bouts) {
    points.push({ at: bout.enter, totalSeconds: running });
    running += Math.max(0, bout.exit - bout.enter);
    points.push({ at: bout.exit, totalSeconds: running });
  }
  points.push({ at: day.end, totalSeconds: running });
  return points;
}

export function buildLyingDownWeek(input: BuildLyingDownWeekInput): LyingDownWeek {
  const { result, selectedDate, zone, now, comparison, outOfStall } = input;
  const dayCount = input.days ?? DEFAULT_DAYS;
  const dayStartHour = input.dayStartHour ?? DEFAULT_DAY_START_HOUR;

  // Lying down is occupancy-shaped: binary samples over time, cut into barn
  // days, grouped into intervals. Reusing the proven layer keeps day cutting,
  // daylight-saving handling and the in-progress-day clamp identical across
  // charts, and means a fix in one place fixes both.
  const timeline = buildOccupancyTimeline({
    result,
    selectedDate,
    days: dayCount,
    zone,
    threshold: DOWN,
    now,
    dayStartHour,
    // One horse, one series. Any label split would be a different chart.
    seriesKey: () => 'lying-down',
  });

  // In-stall runs through the same day cutting, so its intervals line up
  // exactly with the lying-down ones on screen.
  const inStall = input.inStallResult?.length
    ? buildOccupancyTimeline({
        result: input.inStallResult,
        selectedDate,
        days: dayCount,
        zone,
        threshold: DOWN,
        now,
        dayStartHour,
        seriesKey: () => 'in-stall',
      })
    : null;
  const inStallSeries = inStall?.series[0];

  // Which days carry observations at all — independent of whether the horse
  // was down. Without this, an offline monitor is indistinguishable from a
  // horse that never lay down.
  const observedDays = new Set<string>();
  for (const raw of result) {
    for (const [timestamp] of raw.values) {
      const day = timeline.days.find((d) => timestamp >= d.start && timestamp < d.nextMidnight);
      if (day) observedDays.add(day.key);
    }
  }

  const series = timeline.series[0];
  let boutCount = 0;

  const days: LyingDownDay[] = timeline.days.map((day) => {
    const bouts = series?.intervalsByDay[day.key] ?? [];
    boutCount += bouts.length;
    const observed = observedDays.has(day.key);
    return {
      key: day.key,
      start: day.start,
      end: day.end,
      nextMidnight: day.nextMidnight,
      isToday: day.isToday,
      coverage: observed ? 'observed' : 'no-observations',
      totalSeconds: observed ? totalOf(bouts) : null,
      bouts,
      inStallIntervals: inStallSeries?.intervalsByDay[day.key] ?? [],
      inStallSeconds: inStallSeries
        ? totalOf(inStallSeries.intervalsByDay[day.key] ?? [])
        : null,
    };
  });

  const today = days.find((day) => day.isToday) ?? null;

  let state: LyingDownState = input.state ?? 'ready';
  if (state === 'ready') {
    if (outOfStall) state = 'out-of-stall';
    else if (result.length === 0) state = 'no-data';
    else if (days.some((day) => day.coverage === 'no-observations')) state = 'partial';
  }

  return {
    state,
    zone,
    dayStartHour,
    days,
    today,
    cumulative: today ? cumulativeFor(today) : [],
    comparison,
    boutCount,
  };
}

// ---------------------------------------------------------------------------
// Presentation helpers — renderer-independent, so every renderer and the
// accessibility layer speak with one voice.
// ---------------------------------------------------------------------------

/** `2 h 15 min`, `45 min`, `0 min`. Never a bare decimal of hours. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/**
 * The same duration as a display figure rather than as prose: `1h 40m`.
 *
 * Not a second formatting system — a deliberate split by role. The row's today
 * figure is the largest thing on it and is read as a quantity, where the spaces
 * and the word "min" cost width without adding meaning; the average beside it
 * is read as a sentence and keeps `formatDuration`. Charts show one horse's
 * figure per row across five rows, so the width matters.
 */
export function formatDurationCompact(seconds: number): string {
  const total = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * The headline sentence. Returns `null` when there is nothing honest to say,
 * so a caller cannot accidentally render "0 min" over missing observations.
 */
export function headline(week: LyingDownWeek): string | null {
  const today = week.today;
  if (!today || today.totalSeconds === null) return null;
  return `${formatDuration(today.totalSeconds)} lying down today`;
}

/**
 * Rounding slack before upstream's verdict and our arithmetic are treated as
 * genuinely disagreeing. A minute absorbs sampling-step differences between the
 * backend's window and ours without hiding a real contradiction.
 */
const AGREEMENT_TOLERANCE_SECONDS = 60;

/**
 * True when the supplied verdict points the opposite way to the numbers this
 * chart holds — e.g. upstream says "more than usual" while today's total is
 * below the typical it also supplied.
 *
 * This is not defensive noise. The first rendered build hit exactly this: the
 * sentence took its direction from arithmetic and its branch from the verdict,
 * so the card could state a direction its own inputs contradicted. Rather than
 * pick a winner between two authorities, the chart declines to assert a
 * direction at all and the caller shows the headline without a comparison.
 */
export function comparisonDisagrees(week: LyingDownWeek): boolean {
  const { comparison, today } = week;
  if (!comparison || !today || today.totalSeconds === null) return false;
  if (comparison.verdict !== 'more-than-usual' && comparison.verdict !== 'less-than-usual') {
    return false;
  }
  const delta = today.totalSeconds - comparison.typicalByNowSeconds;
  if (Math.abs(delta) <= AGREEMENT_TOLERANCE_SECONDS) return false;
  return comparison.verdict === 'more-than-usual' ? delta < 0 : delta > 0;
}

/**
 * The comparison sentence, or `null` when there is nothing we can honestly say.
 *
 * Direction comes from upstream's `verdict` — Data Science owns the judgement of
 * what counts as unusual (standard §2), and the phone must not re-derive it from
 * a subtraction. Magnitude comes from the difference, because that is arithmetic
 * on values we already hold.
 *
 * Deliberately states magnitude and direction without asserting whether it is
 * good or bad: for a horse, more lying down can mean comfort or illness, and
 * this chart has no basis to say which.
 */
export function comparisonSentence(week: LyingDownWeek): string | null {
  const { comparison, today } = week;
  if (!comparison || !today || today.totalSeconds === null) return null;
  if (comparison.verdict === 'insufficient-history') {
    return `Not enough history yet — ${comparison.basisDays} of the days needed`;
  }
  if (comparison.verdict === 'usual') return 'About usual for this horse by now';
  if (comparisonDisagrees(week)) return null;
  const magnitude = Math.abs(today.totalSeconds - comparison.typicalByNowSeconds);
  const word = comparison.verdict === 'more-than-usual' ? 'more' : 'less';
  return `${formatDuration(magnitude)} ${word} than usual by this time`;
}

/** Day label for the weekly row — matches the occupancy chart's `MMM dd`. */
export function dayLabel(day: LyingDownDay, zone: string): string {
  return DateTime.fromSeconds(day.start, { zone }).toFormat('MMM dd');
}

/** Spoken description of one bout, for the accessibility layer. */
export function boutDescription(bout: LyingDownBout, zone: string): string {
  const from = DateTime.fromSeconds(bout.enter, { zone }).toFormat('h:mm a');
  const to = DateTime.fromSeconds(bout.exit, { zone }).toFormat('h:mm a');
  return `Lying down, ${from} to ${to}, ${formatDuration(bout.exit - bout.enter)}`;
}
