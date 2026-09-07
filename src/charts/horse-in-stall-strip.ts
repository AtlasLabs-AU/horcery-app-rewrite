import { DateTime } from 'luxon';

import { buildHorseInStallWeek, buildHorseInStallWeekly } from './horse-in-stall-behavior';
import type { DayCoverage, LyingDownWeeklyDay, LyingDownWeeklySummary } from './lying-down';
import { observationGaps, type ObservationGap } from './observation-gaps';
import type { PrometheusRangeSeries } from './occupancy-timeline';

/**
 * Horse in Stall on the HORSE page — seven barn days, one strip each.
 *
 * The For You row answers "is today normal?" with a number and a badge. This
 * answers the question a horse page exists for: "what is this horse's pattern?"
 * Seven rows show routine at a glance — the same turnout every morning, the
 * Monday it stayed out, the Sunday the camera dropped — which no single-day
 * view can.
 *
 * ## Decisions it is built on (Inakshi, 2026-09-05)
 *
 * - **Occupancy only.** The dev team's proposed replacement (HC84-36095)
 *   tints each cell by activeness. That needed a legend line to explain the
 *   colour — "if a chart needs a sentence explaining what the colour means,
 *   the colour shouldn't be there. It's not a dashboard." Activeness keeps its
 *   own chart in Horse Trends. Here there are three states and no legend: in,
 *   out, and not recorded, with the tap panel saying it in words.
 * - **Today at the top.** The current day is the first thing you see; the
 *   week reads downward into the past.
 * - **Same engine as For You.** Barn days, outage-vs-turnout, partial days,
 *   verdicts and wording all come from the Horse in Stall behaviour model.
 *   This module adds only the seven-row shape.
 *
 * ## What it does NOT yet do
 *
 * Every row asks "which stall was the horse in on THAT day". Until the backend
 * can answer with dated assignment history (defect CQ-8), all seven rows come
 * from the stall the horse is in now. The caller labels that; this module
 * does not hide it.
 */

/** A run the horse was in the stall. Same shape as a gap; different meaning. */
export type StripStretch = ObservationGap;

export interface HorseInStallStripRow {
  /** `yyyy-MM-dd` in the organization's zone. Stable key, never shown. */
  key: string;
  /** "Today", else the short weekday — "Tue". */
  label: string;
  isToday: boolean;
  /** Barn-day bounds. `upTo` is clamped to now for the day in progress. */
  start: number;
  upTo: number;
  nextMidnight: number;
  coverage: DayCoverage;
  /** Seconds in the stall; `null` when nothing was observed. */
  totalSeconds: number | null;
  /** Solid runs — the horse was in. */
  inStall: StripStretch[];
  /** Grey runs — the monitor was not reporting. Drawn over everything. */
  unobserved: ObservationGap[];
  /** The same day as the weekly model sees it, for the tap panel's wording. */
  detail: LyingDownWeeklyDay;
}

export interface HorseInStallStrip {
  /** Today first, then yesterday, and so on. */
  rows: HorseInStallStripRow[];
  /** Verdict, figures and state for the header — the weekly model's own. */
  summary: LyingDownWeeklySummary;
  zone: string;
}

export interface BuildHorseInStallStripInput {
  /** `response.data.result` from the approved `horse_in_stall` query. */
  result: PrometheusRangeSeries[];
  /** The barn day on screen; the six before it make up the week. */
  selectedDate: string;
  zone: string;
  dayStartHour?: number;
  now: DateTime;
  /** This entity's usual total per weekday. From Data Science; never derived. */
  usualSecondsByWeekday?: Partial<Record<number, number>>;
  /** Created-at of the entity being judged. Gates the verdict. */
  entityCreatedAt?: string | null;
  thresholdPercent?: number;
}

export function buildHorseInStallStrip({
  result,
  selectedDate,
  zone,
  dayStartHour,
  now,
  usualSecondsByWeekday,
  entityCreatedAt,
  thresholdPercent,
}: BuildHorseInStallStripInput): HorseInStallStrip {
  const { week } = buildHorseInStallWeek({
    result,
    selectedDate,
    zone,
    dayStartHour,
    now,
    entityCreatedAt,
    thresholdPercent,
  });
  const summary = buildHorseInStallWeekly(week, {
    usualSecondsByWeekday,
    entityCreatedAt,
    now,
    thresholdPercent,
  });
  const detailByKey = new Map(summary.days.map((day) => [day.key, day]));
  const asOf = now.toSeconds();

  const rows = week.days
    .map<HorseInStallStripRow>((day) => {
      const upTo = Math.min(day.nextMidnight, asOf);
      const detail = detailByKey.get(day.key);
      if (!detail) throw new Error(`weekly model lost day ${day.key}`);
      return {
        key: day.key,
        // Short weekday, not the weekly model's one-letter axis initial: two
        // rows reading "T" and two reading "S" is not a row identity.
        label: day.isToday ? 'Today' : DateTime.fromISO(day.key, { zone }).toFormat('ccc'),
        isToday: day.isToday,
        start: day.start,
        upTo,
        nextMidnight: day.nextMidnight,
        coverage: day.coverage,
        totalSeconds: day.totalSeconds,
        inStall: day.bouts.map((bout) => ({ enter: bout.enter, exit: bout.exit })),
        // A day with no observations at all is one whole gap, which is what
        // draws it grey end to end rather than as an empty (out) track.
        // KNOWN LIMIT (review, 2026-09-05): `coverage` comes from the week
        // model's own gap scan, which measures cadence over undeduplicated
        // stamps across every stream, while this scan deduplicates. With five
        // streams at 90 s the two limits are 300 s and 360 s, so a hole between
        // them is badged Incomplete but draws no grey. The fix is one scan —
        // `buildLyingDownWeek` computing `unobserved` with `observationGaps` and
        // deriving `coverage` from it — and belongs in lying-down.ts, which is
        // mid-edit elsewhere as this is written. Tracked in the register.
        unobserved:
          day.coverage === 'no-observations'
            ? [{ enter: day.start, exit: upTo }]
            : observationGaps(result, day.start, upTo),
        detail,
      };
    })
    // Today first (Inakshi, 2026-09-05): the current day is the first thing
    // you see, and the week reads downward into the past.
    .reverse();

  return { rows, summary, zone };
}
