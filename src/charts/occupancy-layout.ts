import {
  intervalTooltip,
  positionInDay,
  type OccupancyDay,
  type OccupancyInterval,
  type OccupancyTimeline,
} from '@/charts/occupancy-timeline';

/** One renderer-independent rectangle in a People In Stall row. */
export interface OccupancyLayoutBar {
  row: number;
  seriesIndex: number;
  /** Day fractions. A renderer maps these to its own coordinate system. */
  x0: number;
  x1: number;
  /** The original interval when this bar has not been reduced. */
  interval: OccupancyInterval;
  /** Originals represented by a reduced bar, retained for tooltip and a11y. */
  merged?: OccupancyInterval[];
}

export interface OccupancyLayoutRow {
  key: string;
  day: OccupancyDay;
}

export interface OccupancyLayout {
  zone: string;
  rows: OccupancyLayoutRow[];
  seriesIds: string[];
  bars: OccupancyLayoutBar[];
}

/** One overview density cell. Coverage is the occupied share of this time bucket. */
export interface OccupancyOverviewCell {
  row: number;
  seriesIndex: number;
  x0: number;
  x1: number;
  /** Exact occupied duration divided by bucket duration, from 0 through 1. */
  coverage: number;
}

export type OccupancyPresentation =
  | { mode: 'exact'; bars: OccupancyLayoutBar[]; sourceBarCount: number }
  | { mode: 'overview'; cells: OccupancyOverviewCell[]; sourceBarCount: number };

export interface OccupancyPresentationOptions {
  /** The visible day fraction, for example `[0, 1]` or `[0.2, 0.3]`. */
  visibleSpan: readonly [number, number];
  /** Exact intervals are used at or below this bounded rendering cost. */
  maxExactBars?: number;
  /** Fixed number of readable overview buckets across the visible day span. */
  overviewBuckets?: number;
}

export const DEFAULT_MAX_EXACT_OCCUPANCY_BARS = 1_000;
export const DEFAULT_OCCUPANCY_OVERVIEW_BUCKETS = 48;

export interface ReduceOccupancyLayoutOptions {
  /** The visible day fraction, for example `[0, 1]` or `[0.2, 0.3]`. */
  visibleSpan: readonly [number, number];
  /** Width of the plot area in physical pixels, not density-independent points. */
  plotWidthPx: number;
}

/** Turns the domain timeline into geometry shared by every renderer. */
export function layoutOccupancyTimeline(timeline: OccupancyTimeline): OccupancyLayout {
  const rows = timeline.days.map((day) => ({ key: day.key, day }));
  const bars: OccupancyLayoutBar[] = [];

  for (let seriesIndex = 0; seriesIndex < timeline.series.length; seriesIndex++) {
    const series = timeline.series[seriesIndex]!;
    for (let row = 0; row < timeline.days.length; row++) {
      const day = timeline.days[row]!;
      for (const interval of series.intervalsByDay[day.key] ?? []) {
        bars.push({
          row,
          seriesIndex,
          x0: positionInDay(interval.enter, day, timeline.zone),
          x1: positionInDay(interval.exit, day, timeline.zone),
          interval,
        });
      }
    }
  }

  return {
    zone: timeline.zone,
    rows,
    seriesIds: timeline.series.map((series) => series.id),
    bars,
  };
}

/** Original intervals represented by a bar, whether reduced or not. */
export function occupancyLayoutBarIntervals(bar: OccupancyLayoutBar): readonly OccupancyInterval[] {
  return bar.merged ?? [bar.interval];
}

/** Exact legacy tooltip strings, generated lazily only for the selected bar. */
export function occupancyLayoutBarTooltips(bar: OccupancyLayoutBar, zone: string): string[] {
  return occupancyLayoutBarIntervals(bar).map((interval) => intervalTooltip(interval, zone));
}

/** Groups exact bars into the smallest safe set of renderer draw calls. */
export function batchOccupancyLayoutBars(bars: readonly OccupancyLayoutBar[]): OccupancyLayoutBar[][] {
  const batches = new Map<string, OccupancyLayoutBar[]>();
  for (const bar of bars) {
    const key = `${bar.seriesIndex}:${bar.row}`;
    const batch = batches.get(key);
    if (batch) batch.push(bar);
    else batches.set(key, [bar]);
  }
  return [...batches.values()];
}

function originalBars(layout: OccupancyLayout): OccupancyLayoutBar[] {
  const bars: OccupancyLayoutBar[] = [];
  for (const bar of layout.bars) {
    const day = layout.rows[bar.row]?.day;
    if (!day) continue;
    for (const interval of occupancyLayoutBarIntervals(bar)) {
      bars.push({
        row: bar.row,
        seriesIndex: bar.seriesIndex,
        x0: positionInDay(interval.enter, day, layout.zone),
        x1: positionInDay(interval.exit, day, layout.zone),
        interval,
      });
    }
  }
  return bars;
}

/**
 * Collapses detail that a screen physically cannot display.
 *
 * Only adjacent, sub-pixel intervals from the same row and series are merged.
 * Their originals remain attached, so zooming in can reconstruct them and
 * tooltips/accessibility never lose domain meaning.
 */
export function reduceOccupancyLayout(
  layout: OccupancyLayout,
  options: ReduceOccupancyLayoutOptions,
): OccupancyLayout {
  const [visibleStart, visibleEnd] = options.visibleSpan;
  const visibleWidth = visibleEnd - visibleStart;
  if (!(visibleWidth > 0) || !(options.plotWidthPx > 0)) return layout;

  const pixelsPerDayFraction = options.plotWidthPx / visibleWidth;
  const groups = new Map<string, OccupancyLayoutBar[]>();
  const originals = originalBars(layout);

  for (const bar of originals) {
    const key = `${bar.seriesIndex}:${bar.row}`;
    const group = groups.get(key);
    if (group) group.push(bar);
    else groups.set(key, [bar]);
  }

  const reduced: OccupancyLayoutBar[] = [];
  let changed = false;

  for (const group of groups.values()) {
    group.sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1);
    let run: OccupancyLayoutBar[] = [];

    const flush = () => {
      if (run.length === 0) return;
      if (run.length === 1) {
        reduced.push(run[0]!);
      } else {
        changed = true;
        reduced.push({
          row: run[0]!.row,
          seriesIndex: run[0]!.seriesIndex,
          x0: run[0]!.x0,
          x1: run[run.length - 1]!.x1,
          interval: run[0]!.interval,
          merged: run.map((bar) => bar.interval),
        });
      }
      run = [];
    };

    for (const bar of group) {
      if (run.length === 0) {
        run.push(bar);
        continue;
      }

      const previous = run[run.length - 1]!;
      const previousWidthPx = Math.max(0, previous.x1 - previous.x0) * pixelsPerDayFraction;
      const widthPx = Math.max(0, bar.x1 - bar.x0) * pixelsPerDayFraction;
      const gapPx = Math.max(0, bar.x0 - previous.x1) * pixelsPerDayFraction;

      if (previousWidthPx < 1 && widthPx < 1 && gapPx < 1) run.push(bar);
      else {
        flush();
        run.push(bar);
      }
    }
    flush();
  }

  if (!changed && layout.bars.every((bar) => !bar.merged)) return layout;
  return { ...layout, bars: reduced };
}

/** Removes off-screen geometry without changing or merging any interval. */
export function windowOccupancyLayout(
  layout: OccupancyLayout,
  visibleSpan: readonly [number, number],
): OccupancyLayout {
  const [visibleStart, visibleEnd] = visibleSpan;
  const bars = layout.bars.filter((bar) => bar.x1 >= visibleStart && bar.x0 <= visibleEnd);

  return bars.length === layout.bars.length ? layout : { ...layout, bars };
}

/**
 * Chooses a readable overview or exact interval geometry for the viewport.
 *
 * The overview is deliberately not a set of synthetic visits. Each cell says
 * only what share of a time bucket was occupied by one named series. The
 * original layout stays untouched and becomes exact again as soon as the
 * visible interval count is bounded.
 */
export function buildOccupancyPresentation(
  layout: OccupancyLayout,
  options: OccupancyPresentationOptions,
): OccupancyPresentation {
  const [visibleStart, visibleEnd] = options.visibleSpan;
  const maxExactBars = options.maxExactBars ?? DEFAULT_MAX_EXACT_OCCUPANCY_BARS;
  const overviewBuckets = options.overviewBuckets ?? DEFAULT_OCCUPANCY_OVERVIEW_BUCKETS;
  const span = visibleEnd - visibleStart;
  const originals = originalBars(layout);
  const visibleBars = originals.filter((bar) => bar.x1 >= visibleStart && bar.x0 <= visibleEnd);

  if (
    visibleBars.length <= maxExactBars ||
    !(span > 0) ||
    !Number.isInteger(overviewBuckets) ||
    overviewBuckets <= 0
  ) {
    return { mode: 'exact', bars: visibleBars, sourceBarCount: visibleBars.length };
  }

  const bucketWidth = span / overviewBuckets;
  const occupied = new Map<string, number>();

  for (const bar of visibleBars) {
    const start = Math.max(visibleStart, bar.x0);
    const end = Math.min(visibleEnd, bar.x1);
    if (!(end > start)) continue;

    const firstBucket = Math.max(0, Math.floor((start - visibleStart) / bucketWidth));
    const lastBucket = Math.min(
      overviewBuckets - 1,
      Math.floor((end - visibleStart - Number.EPSILON) / bucketWidth),
    );

    for (let bucket = firstBucket; bucket <= lastBucket; bucket++) {
      const bucketStart = visibleStart + bucket * bucketWidth;
      const bucketEnd = bucketStart + bucketWidth;
      const overlap = Math.max(0, Math.min(end, bucketEnd) - Math.max(start, bucketStart));
      if (!(overlap > 0)) continue;
      const key = `${bar.row}:${bar.seriesIndex}:${bucket}`;
      occupied.set(key, (occupied.get(key) ?? 0) + overlap);
    }
  }

  const cells: OccupancyOverviewCell[] = [];
  for (const [key, duration] of occupied) {
    const [row, seriesIndex, bucket] = key.split(':').map(Number) as [number, number, number];
    const x0 = visibleStart + bucket * bucketWidth;
    cells.push({
      row,
      seriesIndex,
      x0,
      x1: x0 + bucketWidth,
      // Defensive clamp for malformed overlapping intervals in one series.
      coverage: Math.max(0, Math.min(1, duration / bucketWidth)),
    });
  }

  cells.sort((a, b) => a.seriesIndex - b.seriesIndex || a.row - b.row || a.x0 - b.x0);
  return { mode: 'overview', cells, sourceBarCount: visibleBars.length };
}
