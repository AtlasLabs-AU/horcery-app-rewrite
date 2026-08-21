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
  /** Following local midnight before `end` is clamped to now. */
  nextMidnight: EpochSeconds;
  /** UTC offset, in seconds, in force at `start`. */
  utcOffset: number;
  /** The one offset transition on this day, when daylight saving changes. */
  utcOffsetChange?: { at: EpochSeconds; utcOffset: number };
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
  /**
   * The last (bottom) day shown, as a CALENDAR DATE: `yyyy-MM-dd`.
   *
   * Deliberately not a DateTime. A DateTime is an instant, and the same instant
   * is a different calendar day in different zones — midnight on the 14th in
   * Colombo is still the 13th in Chicago — so accepting one invites the chart
   * to show the wrong week for a travelling manager. A date string has no such
   * ambiguity: it is interpreted in `zone`, full stop.
   */
  selectedDate: string;
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
  /**
   * Hour the BARN day begins, 0–23. Default 0 (calendar midnight), which is
   * what People In Stall has always used and what its characterised behaviours
   * are pinned to.
   *
   * Lying Down needs 6: horses rest overnight, so a midnight cut splits one
   * night's sleep across two rows and halves it into both. The approved
   * Prometheus queries already carry a barn-day offset, so the phone must cut
   * days the same way or its totals will not match the backend's averages.
   */
  dayStartHour?: number;
}

export const DEFAULT_DAYS = 7;
const DAY_KEY = 'yyyy-MM-dd';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcOffsetSeconds(t: EpochSeconds, zone: string): number {
  return DateTime.fromSeconds(t, { zone }).offset * 60;
}

/** Finds the first whole second using the day's new UTC offset. */
function findUtcOffsetChange(
  start: EpochSeconds,
  nextMidnight: EpochSeconds,
  zone: string,
  initialOffset: number,
): OccupancyDay['utcOffsetChange'] {
  const finalOffset = utcOffsetSeconds(nextMidnight - 1, zone);
  if (finalOffset === initialOffset) return undefined;

  let before = start;
  let after = nextMidnight - 1;
  while (before + 1 < after) {
    const middle = Math.floor((before + after) / 2);
    if (utcOffsetSeconds(middle, zone) === initialOffset) before = middle;
    else after = middle;
  }

  return { at: after, utcOffset: utcOffsetSeconds(after, zone) };
}

/** Parses a `yyyy-MM-dd` calendar date as local midnight in `zone`, or throws. */
function calendarDate(value: string, zone: string): DateTime {
  if (!CALENDAR_DATE.test(value)) {
    throw new Error(
      `selectedDate must be a calendar date "yyyy-MM-dd", got ${JSON.stringify(value)}. ` +
        'Pass a date, not an instant: an instant is a different day in a different zone.',
    );
  }
  const parsed = DateTime.fromISO(value, { zone });
  if (!parsed.isValid) {
    throw new Error(`selectedDate ${JSON.stringify(value)} is not a real date: ${parsed.invalidExplanation}`);
  }
  return parsed.startOf('day');
}

/**
 * Cuts the interval list for ONE day out of that day's samples.
 *
 * An interval opens when the value rises above threshold and closes when it
 * changes to something else. If the day ends (or `now` arrives) while it is
 * still open, a synthetic closing sample is added so the bar reaches the edge
 * of the row instead of vanishing.
 *
 * Two departures from the shipping app, both QA-confirmed defects (Codex
 * review, sign-off Inakshi 2026-08-21):
 *
 * - **Values compare as numbers.** Prometheus can serialise the same reading
 *   as "1" or "1.0"; comparing the text split one continuous visit into two.
 * - **An interval never spans a hole in the data.** "Present", four silent
 *   hours, "present" again used to count the silence as presence — the same
 *   stretch the coverage layer was simultaneously reporting as unobserved. An
 *   open interval now closes at the last sample actually seen before a gap
 *   longer than `gapLimit`, and the same rule applies to the synthetic close
 *   at the window's edge.
 */
function intervalsForDay(
  samples: [EpochSeconds, string][],
  day: OccupancyDay,
  threshold: number,
  gapLimit: number | null,
): OccupancyInterval[] {
  if (samples.length === 0) return [];

  // Prometheus normally returns ascending timestamps. Buckets are private to
  // this build, so avoid copying/sorting the common case while retaining the
  // old app's defensive behaviour for interleaved results.
  let isSorted = true;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1]![0] > samples[i]![0]) {
      isSorted = false;
      break;
    }
  }
  const sorted = isSorted ? samples : samples.sort((a, b) => a[0] - b[0]);

  const last = sorted[sorted.length - 1]!;
  if (Number(last[1]) > threshold) {
    // Still occupied at the end of the window: close the bar at the row's edge
    // — unless the samples stopped well short of it, in which case the honest
    // close is the last moment we actually observed. (The current app closes
    // at 23:59:59.999; we close at the next midnight — a 1ms difference that
    // lets adjacent days meet exactly.)
    const edge =
      gapLimit !== null && day.end - last[0] > gapLimit ? last[0] : day.end;
    sorted.push([edge, String(threshold)]);
  }

  const intervals: OccupancyInterval[] = [];
  const close = (enter: EpochSeconds, exit: EpochSeconds, value: number) => {
    if (exit > enter) intervals.push({ enter, exit, count: Math.round(value) });
  };

  let enter = sorted[0]![0];
  let value = Number(sorted[0]![1]);
  let previous = sorted[0]![0];

  for (let i = 1; i < sorted.length; i++) {
    const [t, raw] = sorted[i]!;
    const v = Number(raw);

    if (gapLimit !== null && t - previous > gapLimit) {
      // The monitor went silent. Whatever was true before the hole ended at
      // the last real sample; whatever is true after it starts fresh.
      if (value > threshold) close(enter, previous, value);
      enter = t;
      value = v;
      previous = t;
      continue;
    }
    previous = t;

    if (v === value) continue;
    if (value > threshold) close(enter, t, value);
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
  // Which barn day "now" falls in: before the start hour, we are still in
  // yesterday's barn day.
  const nowKey = now.minus({ hours: input.dayStartHour ?? 0 }).toFormat(DAY_KEY);
  const dayStartHour = input.dayStartHour ?? 0;
  // Fractional is allowed: the organization's `chart_start_time` carries
  // minutes, so a barn that starts at 05:30 is 5.5 here. Integer-only would
  // have silently rounded a real customer setting.
  if (!Number.isFinite(dayStartHour) || dayStartHour < 0 || dayStartHour >= 24) {
    throw new RangeError(`dayStartHour must be 0 to <24, got ${dayStartHour}`);
  }
  const selected = calendarDate(input.selectedDate, zone).plus({ hours: dayStartHour });

  // Rows: `dayCount` calendar days ending on the selected date, oldest first.
  const days: OccupancyDay[] = [];
  for (let offset = dayCount - 1; offset >= 0; offset--) {
    const start = selected.minus({ days: offset });
    const followingMidnight = start.plus({ days: 1 });
    const key = start.minus({ hours: dayStartHour }).toFormat(DAY_KEY);
    const startSeconds = start.toSeconds();
    const nextMidnight = followingMidnight.toSeconds();
    const utcOffset = start.offset * 60;
    const isToday = key === nowKey;
    days.push({
      key,
      start: startSeconds,
      // A day still in progress ends at `now`, so an open bar stops at the
      // present rather than running to midnight and claiming the future.
      end: isToday ? Math.min(nextMidnight, nowSeconds) : nextMidnight,
      nextMidnight,
      utcOffset,
      utcOffsetChange: findUtcOffsetChange(startSeconds, nextMidnight, zone, utcOffset),
      isToday,
    });
  }

  const series: OccupancySeries[] = [];
  let intervalCount = 0;

  for (const raw of result) {
    // Samples in the future are noise from `end` overshooting `now`; drop them
    // (the current app does the same).
    const byDay: [EpochSeconds, string][][] = days.map(() => []);
    let dayIndex = 0;
    let previousTimestamp = Number.NEGATIVE_INFINITY;

    for (const sample of raw.values) {
      const timestamp = sample[0];
      if (timestamp > nowSeconds) continue;

      if (timestamp < previousTimestamp) {
        // A defensive fallback for interleaved input. Seven rows make this
        // bounded scan cheaper and clearer than rebuilding date strings.
        dayIndex = days.findIndex((day) => timestamp >= day.start && timestamp < day.nextMidnight);
      } else {
        while (dayIndex < days.length && timestamp >= days[dayIndex]!.nextMidnight) dayIndex++;
      }
      previousTimestamp = timestamp;

      const day = days[dayIndex];
      if (!day || timestamp < day.start) continue;
      byDay[dayIndex]!.push(sample);
    }

    // How far apart this series' samples usually are, measured rather than
    // assumed (these queries have shipped at 30, 60 and 90-second steps). A
    // stretch beyond four times that spacing — never under five minutes — is a
    // hole, and an interval must not claim it. Same rule as the coverage scans.
    const stamps = raw.values
      .map(([timestamp]) => timestamp)
      .filter((timestamp) => timestamp <= nowSeconds)
      .sort((a, b) => a - b);
    const cadences = stamps
      .slice(1)
      .map((timestamp, i) => timestamp - stamps[i]!)
      .sort((a, b) => a - b);
    const median = cadences[Math.floor(cadences.length / 2)];
    const gapLimit = median === undefined ? null : Math.max(median * 4, 300);

    const intervalsByDay: Record<string, OccupancyInterval[]> = {};
    for (let i = 0; i < days.length; i++) {
      const day = days[i]!;
      const intervals = intervalsForDay(byDay[i]!, day, threshold, gapLimit);
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
 * Where a moment sits across the row: 0 = midnight, 1 = the next midnight,
 * by LOCAL CLOCK TIME — 7:00 AM is 7/24 on every row.
 *
 * Clock alignment is the point of the chart: seven rows share one hour axis so
 * the eye can scan "what happens around 7 AM" straight down. The current app
 * does the same (it projects clock time onto a fixed 1970 date) and we keep it
 * deliberately. The price is paid twice a year, between 1 and 3 AM:
 *
 *   - Spring forward (23 h day): the 2 AM hour never happens. A bar spanning
 *     1:30→3:30 local is one real hour but draws two clock hours wide.
 *   - Fall back (25 h day): 1:00–1:59 AM happens twice. Both land in the same
 *     slot, so a bar in the repeated hour OVERLAPS the first one, and a bar
 *     spanning 1:30 CDT→1:30 CST (one real hour) draws with zero width — the
 *     renderer's 1 px minimum is what keeps it visible.
 *
 * Positioning by real elapsed time instead would fix both and break the
 * vertical scan on that day for every hour after 2 AM. Barns are quiet at
 * 2 AM; the scan matters all day. See PEOPLE_IN_STALL.md §9.
 */
export function positionInDay(t: EpochSeconds, day: OccupancyDay, _zone: string): number {
  if (t <= day.start) return 0;
  // The closing midnight is clock 00:00 of the NEXT day; it must read as 1.
  if (t >= day.nextMidnight) return 1;

  const offset = day.utcOffsetChange && t >= day.utcOffsetChange.at
    ? day.utcOffsetChange.utcOffset
    : day.utcOffset;
  const clockSeconds = t + offset - (day.start + day.utcOffset);
  return clockSeconds / 86400;
}

/**
 * The shared hour axis: 25 ticks, "12 AM" … "11 PM", "12 AM", at i/24.
 * Identical on every row, every day — including daylight-saving days, where
 * "2 AM" is drawn once even though the hour happened zero or two times.
 */
export function hourTicks(): { label: string; position: number }[] {
  const midnight = DateTime.fromObject({ year: 2000, month: 1, day: 1 }, { zone: 'UTC' });
  return Array.from({ length: 25 }, (_, hour) => ({
    label: midnight.plus({ hours: hour }).toFormat('h a'),
    position: hour / 24,
  }));
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
