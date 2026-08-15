import { DateTime } from 'luxon';

/**
 * Occupancy timeline — the renderer-independent model behind People In Stall
 * (and its siblings: Sitting Down, People In Space, Stall Occupancy).
 *
 * This is the "chart domain layer" of requirements §6a. It knows nothing about
 * ECharts, Victory or Skia. It turns a Prometheus range-query response into a
 * fully described picture — rows, bars, labels, tooltip text — that any
 * renderer can draw. The two §6a spikes render THIS, so they are compared on
 * drawing alone, not on who parsed the data better.
 *
 * Characterised from the current app's `prometheus-bar-chart-widget-v3`
 * (`processSeries`) and `compound-bar-chart.ts`. Behaviour is preserved except
 * where the catalogue (PEOPLE_IN_STALL.md) records a deliberate change, each
 * of which is a legacy defect. See the "Legacy quirks" section there before
 * "fixing" anything here back to the old behaviour.
 */

/** Seconds since the Unix epoch — what Prometheus speaks. */
export type EpochSeconds = number;

/** One Prometheus range-query series, exactly as the API returns it. */
export interface PrometheusRangeSeries {
  metric: Record<string, string>;
  /** `[timestamp, value]` — Prometheus sends the value as a string. */
  values: [EpochSeconds, string][];
}

/** One continuous stretch of occupancy above the threshold. */
export interface OccupancyInterval {
  enter: EpochSeconds;
  exit: EpochSeconds;
  /** The representative count over the interval — "No. of people". */
  count: number;
}

/** One row of the chart: a calendar day in the organization's zone. */
export interface OccupancyDay {
  /** `yyyy-MM-dd` in the chart's zone. Stable key; never shown to the user. */
  key: string;
  /** Local midnight, and the following local midnight. */
  start: EpochSeconds;
  end: EpochSeconds;
  /** Whether `end` had to be clamped to `now` — the day is still in progress. */
  isToday: boolean;
}

export interface OccupancySeries {
  /** Distinguishes series — for People In Stall, the `Event_Type` label. */
  id: string;
  /** Intervals per day key. Days with nothing above threshold are absent. */
  intervalsByDay: Record<string, OccupancyInterval[]>;
}

export interface OccupancyTimeline {
  zone: string;
  /** Oldest first — matches the current app's row order (oldest at the top). */
  days: OccupancyDay[];
  series: OccupancySeries[];
  /** Total bar count — the number a renderer has to draw, and the spike's load. */
  intervalCount: number;
}

export interface BuildOccupancyTimelineInput {
  /** `response.data.result` from the range query. Empty means "no data". */
  result: PrometheusRangeSeries[];
  /** The last (bottom) day shown. ISO date or DateTime. */
  selectedDate: DateTime | string;
  /** How many days to show, ending on `selectedDate`. The current app shows 7. */
  days?: number;
  /** IANA zone the days are cut in — the ORGANIZATION's zone (§6c), not the phone's. */
  zone: string;
  /** Samples at or below this are "nobody there". People In Stall uses 0.2. */
  threshold: number;
  /** Injected so the result is deterministic in tests and fixtures. */
  now: DateTime;
  /** Which metric label distinguishes series. Defaults to `Event_Type`. */
  seriesKey?: (metric: Record<string, string>) => string;
}

export const DEFAULT_DAYS = 7;
const DAY_KEY = 'yyyy-MM-dd';

const toDateTime = (value: DateTime | string, zone: string) =>
  typeof value === 'string'
    ? DateTime.fromISO(value, { zone })
    : value.setZone(zone);

/**
 * Cuts the interval list for ONE day out of that day's samples.
 *
 * Faithful to the current app: an interval opens when the value rises above
 * threshold and closes when it changes to something else. If the day ends (or
 * `now` arrives) while it is still open, a synthetic closing sample is added so
 * the bar reaches the edge of the row instead of vanishing.
 */
function intervalsForDay(
  samples: [EpochSeconds, string][],
  day: OccupancyDay,
  threshold: number,
): OccupancyInterval[] {
  if (samples.length === 0) return [];

  // Prometheus returns ascending timestamps, but the current app sorts
  // defensively and so do we — a merged multi-series result can interleave.
  const sorted = [...samples].sort((a, b) => a[0] - b[0]);

  const last = sorted[sorted.length - 1]!;
  if (Number(last[1]) > threshold) {
    // Still occupied at the end of the window: close the bar at the row's edge.
    // (The current app closes at 23:59:59.999; we close at the next midnight —
    // a 1ms difference that lets adjacent days meet exactly.)
    sorted.push([day.end, '0']);
  }

  const intervals: OccupancyInterval[] = [];
  let enter = sorted[0]![0];
  let value = sorted[0]![1];

  for (let i = 1; i < sorted.length; i++) {
    const [t, v] = sorted[i]!;
    if (v === value) continue;

    if (Number(value) > threshold) {
      intervals.push({ enter, exit: t, count: Math.round(Number(value)) });
    }
    enter = t;
    value = v;
  }

  return intervals;
}

/**
 * Builds the timeline. Pure: same input, same output, no clock, no I/O.
 */
export function buildOccupancyTimeline(
  input: BuildOccupancyTimelineInput,
): OccupancyTimeline {
  const {
    result,
    zone,
    threshold,
    days: dayCount = DEFAULT_DAYS,
    seriesKey = (metric) => metric.Event_Type ?? 'default',
  } = input;

  const now = input.now.setZone(zone);
  const nowSeconds = now.toSeconds();
  const selected = toDateTime(input.selectedDate, zone).startOf('day');

  // Rows: `dayCount` calendar days ending on the selected date, oldest first.
  const days: OccupancyDay[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset--) {
    const start = selected.minus({ days: offset });
    const end = start.plus({ days: 1 });
    const isToday = start.toFormat(DAY_KEY) === now.toFormat(DAY_KEY);
    days.push({
      key: start.toFormat(DAY_KEY),
      start: start.toSeconds(),
      // A day still in progress ends at `now`, so an open bar stops at the
      // present rather than running to midnight and claiming the future.
      end: isToday ? Math.min(end.toSeconds(), nowSeconds) : end.toSeconds(),
      isToday,
    });
  }
  const dayByKey = new Map(days.map((day) => [day.key, day]));

  const series: OccupancySeries[] = [];
  let intervalCount = 0;

  for (const raw of result) {
    // Samples in the future are noise from `end` overshooting `now`; drop them
    // (the current app does the same).
    const byDay = new Map<string, [EpochSeconds, string][]>();
    for (const sample of raw.values) {
      if (sample[0] > nowSeconds) continue;
      const key = DateTime.fromSeconds(sample[0], { zone }).toFormat(DAY_KEY);
      if (!dayByKey.has(key)) continue; // outside the visible rows
      let bucket = byDay.get(key);
      if (!bucket) byDay.set(key, (bucket = []));
      bucket.push(sample);
    }

    const intervalsByDay: Record<string, OccupancyInterval[]> = {};
    for (const day of days) {
      const intervals = intervalsForDay(byDay.get(day.key) ?? [], day, threshold);
      if (intervals.length > 0) {
        intervalsByDay[day.key] = intervals;
        intervalCount += intervals.length;
      }
    }

    series.push({ id: seriesKey(raw.metric), intervalsByDay });
  }

  return { zone, days, series, intervalCount };
}

// ---------------------------------------------------------------------------
// Presentation helpers — still renderer-independent. A renderer asks these for
// its labels and text so that every renderer shows the same words.
// ---------------------------------------------------------------------------

/** Row label — the current app shows `MMM dd` ("Aug 14"). */
export function dayLabel(day: OccupancyDay, zone: string): string {
  return DateTime.fromSeconds(day.start, { zone }).toFormat('MMM dd');
}

/**
 * Where a moment sits across the row, 0 = local midnight, 1 = next midnight.
 *
 * Computed against the day's REAL start and end, so a 23- or 25-hour daylight
 * saving day still spans the row exactly. (The current app projects clock time
 * onto a fixed 1970 date, which slides bars by up to an hour on those days.)
 */
export function positionInDay(t: EpochSeconds, day: OccupancyDay, zone: string): number {
  const dayStart = DateTime.fromSeconds(day.start, { zone });
  const dayEnd = dayStart.plus({ days: 1 });
  const span = dayEnd.toSeconds() - day.start;
  return Math.min(1, Math.max(0, (t - day.start) / span));
}

/**
 * Hourly x-axis ticks: label + position. Labels are `h a` ("12 AM", "3 PM"),
 * as in the current app. Walks real local hours, so a daylight-saving day
 * yields 23 or 25 of them and the axis still ends at the next midnight.
 */
export function hourTicks(day: OccupancyDay, zone: string): { label: string; position: number }[] {
  const start = DateTime.fromSeconds(day.start, { zone });
  const end = start.plus({ days: 1 });
  const ticks: { label: string; position: number }[] = [];
  for (let at = start; at < end; at = at.plus({ hours: 1 })) {
    ticks.push({ label: at.toFormat('h a'), position: positionInDay(at.toSeconds(), day, zone) });
  }
  ticks.push({ label: end.toFormat('h a'), position: 1 });
  return ticks;
}

/**
 * Tooltip body, word for word what the current app shows:
 *
 *     2026-08-14  |  7:02 AM - 7:41 AM
 *     No. of people: 2
 */
export function intervalTooltip(
  interval: OccupancyInterval,
  zone: string,
  options: { showCount?: boolean; countLabel?: string } = {},
): string {
  const { showCount = true, countLabel = 'No. of people' } = options;
  const enter = DateTime.fromSeconds(interval.enter, { zone });
  const exit = DateTime.fromSeconds(interval.exit, { zone });
  const head = `${enter.toFormat('yyyy-MM-dd')}  |  ${enter.toFormat('h:mm a')} - ${exit.toFormat('h:mm a')}`;
  return showCount ? `${head}\n${countLabel}: ${interval.count}` : head;
}

/** Zoom limits from the current app: never narrower than 10% of the day. */
export const ZOOM = { minSpan: 0.1, maxSpan: 1 } as const;
