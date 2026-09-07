import type { DateTime } from 'luxon';

import {
  buildOccupancyTimeline,
  type EpochSeconds,
  type OccupancyInterval,
  type PrometheusRangeSeries,
} from './occupancy-timeline';

/**
 * Lying Down timeline — the 7-day chart on Horse Details (and its shared use on
 * Stall Details). Requirements: `84-.../docs/requirements/2026-09-07-lying-down-chart-accuracy.md`.
 *
 * Presentation (Inakshi, 2026-09-07, mockup v3): the ORIGINAL chart — bars on
 * plain day rows, oldest at the top, tap for a tooltip — plus exactly one
 * addition: a dashed "No readings" stretch wherever we have nothing. That one
 * state absorbs both a camera outage and the hours before the horse was
 * assigned to this stall; the customer's honest statement is the same in both
 * cases, and the chart claims no more than the data supports.
 *
 * ## What a sample means (brief §3A — "establish and document")
 *
 * The monitors' own metadata defines `horse_sitting*` as "fraction of time in
 * the prometheus window the horse was sitting (0.0–1.0)", and the timeline's
 * query is `round(clamp_max(avg_over_time(horse_sitting[1m30s:30s] offset -1m),1))`.
 * So a sample stamped T summarises the 90 seconds ending at T − 1 min, rounded
 * to a yes/no. A positive sample therefore supports the window BEHIND it, not
 * time after it — which is why a bout ends at its last positive sample and is
 * never extended to midnight, to now, or by "one step" (legacy `widget-v3:146`
 * added 89 s to reach 23:59:59). The occupancy builder already closes bouts at
 * the last real sample and breaks them at recording gaps.
 *
 * Gap tolerance follows from the same contract: samples arrive every 30 s, so
 * silence beyond four times the measured cadence (floor five minutes) is a hole
 * in observation, not a pause in rest.
 *
 * ## Day boundary (brief §3D)
 *
 * Midnight in the ORGANIZATION's zone, matching the legacy timeline — decided
 * with the mockup, not inherited from the Behavior Tracker's 6 AM rule. The
 * legacy chart cut days in the phone's zone (`widget-v3:211`) and projected
 * timestamps onto 1970 (`compound-bar-chart.ts:21`); neither survives here.
 *
 * ## Stall assignment (brief §3C)
 *
 * The one fact the assignment record gives is WHEN the horse was assigned to
 * this stall. Samples before that moment belong to whoever the camera was
 * watching then, so they are dropped before anything is built — which makes
 * the gap detector mark the stretch "No readings" through the same mechanism
 * as an outage. No second visual state, no sentence, no claim about where the
 * horse was. Stitching across a KNOWN previous stall is out of scope until the
 * assignment history API is confirmed to return earlier rows.
 */

/** A stretch with no observations — drawn dashed, never as a zero. */
export interface UnobservedStretch {
  from: EpochSeconds;
  to: EpochSeconds;
}

export interface TimelineDay {
  /** `yyyy-MM-dd` in the organization's zone. */
  key: string;
  start: EpochSeconds;
  /** Clamped to now for today; a renderer draws nothing past it. */
  end: EpochSeconds;
  /** The unclamped next midnight — the row's full width. */
  nextMidnight: EpochSeconds;
  isToday: boolean;
  bouts: OccupancyInterval[];
  unobserved: UnobservedStretch[];
}

export interface LyingDownTimeline {
  zone: string;
  days: TimelineDay[];
  state: 'ready' | 'no-data';
}

export interface BuildLyingDownTimelineInput {
  result: PrometheusRangeSeries[];
  /** Last day shown, `yyyy-MM-dd`, read in `zone`. */
  selectedDate: string;
  zone: string;
  now: DateTime;
  /**
   * When this horse was assigned to the stall whose camera produced `result`.
   * Samples before it are not this horse's. Omit for a stall-view chart, whose
   * subject is the stall itself.
   */
  assignedAt?: EpochSeconds | null;
  days?: number;
}

/** Above threshold the rounded reading is a 1: the horse was down. */
const DOWN = 0.5;
/** Silence beyond this multiple of the measured cadence is a hole. */
const GAP_MULTIPLE = 4;
const GAP_FLOOR_SECONDS = 300;

export function buildLyingDownTimeline({
  result,
  selectedDate,
  zone,
  now,
  assignedAt,
  days = 7,
}: BuildLyingDownTimelineInput): LyingDownTimeline {
  // Readings from before the assignment are the previous occupant's, not this
  // horse's. Removing them here lets the gap detector below report the stretch
  // as unobserved with no special case.
  const scoped =
    assignedAt == null
      ? result
      : result.map((series) => ({
          ...series,
          values: series.values.filter(([at]) => at >= assignedAt),
        }));

  const timeline = buildOccupancyTimeline({
    result: scoped,
    selectedDate,
    zone,
    days,
    threshold: DOWN,
    now,
    dayStartHour: 0,
    seriesKey: () => 'lying-down',
    // Binary signal: several tracks of the same horse union safely — measured
    // on sm-1272, three streams never overlapping (register, 2026-08-23).
    combineSameKeyStreams: true,
  });

  const series = timeline.series[0];
  const stamps = scoped
    .flatMap((raw) => raw.values.map(([at]) => at))
    .filter((at) => at <= now.toSeconds())
    .sort((a, b) => a - b);
  const gapLimit = gapLimitFor(stamps);

  const built: TimelineDay[] = timeline.days.map((day) => ({
    key: day.key,
    start: day.start,
    end: day.end,
    nextMidnight: day.nextMidnight,
    isToday: day.isToday,
    bouts: series?.intervalsByDay[day.key] ?? [],
    unobserved: unobservedWithin(stamps, day.start, day.end, gapLimit),
  }));

  return {
    zone,
    days: built,
    state: stamps.length === 0 ? 'no-data' : 'ready',
  };
}

/** Measured from the data, not assumed: these queries have shipped at 30, 60 and 90 s. */
function gapLimitFor(stamps: readonly number[]): number {
  const steps = stamps
    .slice(1)
    .map((at, i) => at - stamps[i]!)
    .sort((a, b) => a - b);
  const median = steps[Math.floor(steps.length / 2)] ?? 60;
  return Math.max(median * GAP_MULTIPLE, GAP_FLOOR_SECONDS);
}

/**
 * Stretches of [from, to] with no sample within `gapLimit` of the last one.
 *
 * A day with no samples at all is one stretch spanning the day. A leading or
 * trailing silence counts too — the hours before the first reading of the day
 * are just as unobserved as a hole in the middle.
 */
export function unobservedWithin(
  stamps: readonly number[],
  from: EpochSeconds,
  to: EpochSeconds,
  gapLimit: number,
): UnobservedStretch[] {
  if (to <= from) return [];
  const inRange = stamps.filter((at) => at >= from && at <= to);
  if (inRange.length === 0) return [{ from, to }];

  const gaps: UnobservedStretch[] = [];
  if (inRange[0]! - from > gapLimit) gaps.push({ from, to: inRange[0]! });
  for (let i = 1; i < inRange.length; i++) {
    if (inRange[i]! - inRange[i - 1]! > gapLimit) {
      gaps.push({ from: inRange[i - 1]!, to: inRange[i]! });
    }
  }
  const last = inRange.at(-1)!;
  if (to - last > gapLimit) gaps.push({ from: last, to });
  return gaps;
}

/** Seconds actually observed lying down on a day — bouts only, never gaps. */
export function observedRestSeconds(day: TimelineDay): number {
  return day.bouts.reduce((sum, bout) => sum + Math.max(0, bout.exit - bout.enter), 0);
}
