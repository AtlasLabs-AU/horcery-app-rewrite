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
