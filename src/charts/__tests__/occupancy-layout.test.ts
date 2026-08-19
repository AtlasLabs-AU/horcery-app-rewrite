import { DateTime } from 'luxon';

import {
  buildOccupancyPresentation,
  layoutOccupancyTimeline,
  batchOccupancyLayoutBars,
  occupancyLayoutBarIntervals,
  occupancyLayoutBarTooltips,
  reduceOccupancyLayout,
  windowOccupancyLayout,
} from '@/charts/occupancy-layout';
import {
  PEOPLE_IN_STALL,
  daylightSaving,
  daylightSavingFallBack,
  denseWeek,
  normalWeek,
  overnight,
  worstCase,
} from '@/charts/fixtures/people-in-stall';
import { buildOccupancyTimeline } from '@/charts/occupancy-timeline';

const buildLayout = (fixture: typeof worstCase) =>
  layoutOccupancyTimeline(
    buildOccupancyTimeline({
      result: fixture.result,
      selectedDate: fixture.selectedDate,
      zone: fixture.zone,
      threshold: PEOPLE_IN_STALL.threshold,
      now: DateTime.fromISO(fixture.now, { zone: fixture.zone }),
    }),
  );

const fullWeek = { visibleSpan: [0, 1] as const, plotWidthPx: 350 };

describe('renderer-independent occupancy layout', () => {
  it('lays out every ceiling interval without losing its row or series', () => {
    const layout = buildLayout(worstCase);

    expect(layout.rows).toHaveLength(7);
    expect(layout.seriesIds).toEqual(['Human_Interaction', 'Human_Presence']);
    expect(layout.bars).toHaveLength(6720);
    expect(layout.bars.every((bar) => bar.row >= 0 && bar.row < 7)).toBe(true);
    expect(layout.bars.every((bar) => bar.seriesIndex === 0 || bar.seriesIndex === 1)).toBe(true);
  });

  it('substantially reduces sub-pixel ceiling bars at the full-week view', () => {
    const layout = buildLayout(worstCase);
    const reduced = reduceOccupancyLayout(layout, fullWeek);

    expect(reduced.bars.length).toBeLessThan(layout.bars.length / 2);
    expect(reduced.bars.some((bar) => (bar.merged?.length ?? 0) > 1)).toBe(true);
  });

  it('restores original detail when a ten-percent span makes the bars visible', () => {
    const layout = buildLayout(worstCase);
    const reduced = reduceOccupancyLayout(layout, fullWeek);
    const zoomed = reduceOccupancyLayout(reduced, { visibleSpan: [0, 0.1], plotWidthPx: 350 });

    expect(zoomed.bars).toHaveLength(layout.bars.length);
    expect(zoomed.bars.every((bar) => !bar.merged)).toBe(true);
  });

  it('keeps exact ceiling geometry in 14 row/series draw batches', () => {
    const layout = buildLayout(worstCase);
    const visibleSpan = [0.2, 0.3] as const;
    const batches = batchOccupancyLayoutBars(layout.bars);
    const viewport = windowOccupancyLayout(layout, visibleSpan);
    const expected = layout.bars.filter((bar) => bar.x1 >= visibleSpan[0] && bar.x0 <= visibleSpan[1]);

    // The renderer turns each batch into one Skia path: 14 React/Skia nodes,
    // while all 6,720 exact rectangles and their gaps remain in those paths.
    expect(batches).toHaveLength(14);
    expect(batches.flat()).toEqual(layout.bars);
    expect(viewport.bars.length).toBeLessThan(1_000);
    expect(viewport.bars).toEqual(expected);
    expect(viewport.bars.every((bar) => bar.x1 >= visibleSpan[0] && bar.x0 <= visibleSpan[1])).toBe(true);
  });

  it('turns the unreadable ceiling into an accurate 30-minute density overview', () => {
    const layout = buildLayout(worstCase);
    const presentation = buildOccupancyPresentation(layout, { visibleSpan: [0, 1] });

    expect(presentation.mode).toBe('overview');
    if (presentation.mode !== 'overview') throw new Error('expected overview');
    expect(presentation.sourceBarCount).toBe(6_720);
    expect(presentation.cells).toHaveLength(48 * 2 * 7);
    expect(presentation.cells.every((cell) => Math.abs(cell.coverage - 0.5) < 1e-10)).toBe(true);
    expect(new Set(presentation.cells.map((cell) => cell.seriesIndex))).toEqual(new Set([0, 1]));
  });

  it('preserves exact occupied duration for every row and series in the overview', () => {
    const layout = buildLayout(worstCase);
    const presentation = buildOccupancyPresentation(layout, { visibleSpan: [0, 1] });
    if (presentation.mode !== 'overview') throw new Error('expected overview');

    for (let row = 0; row < 7; row++) {
      for (let seriesIndex = 0; seriesIndex < 2; seriesIndex++) {
        const exactDuration = layout.bars
          .filter((bar) => bar.row === row && bar.seriesIndex === seriesIndex)
          .reduce((total, bar) => total + bar.x1 - bar.x0, 0);
        const overviewDuration = presentation.cells
          .filter((cell) => cell.row === row && cell.seriesIndex === seriesIndex)
          .reduce((total, cell) => total + cell.coverage * (cell.x1 - cell.x0), 0);

        expect(overviewDuration).toBeCloseTo(exactDuration, 10);
      }
    }
  });

  it('returns to exact source intervals when zoom bounds the visible work', () => {
    const layout = buildLayout(worstCase);
    const presentation = buildOccupancyPresentation(layout, { visibleSpan: [0, 0.1] });

    expect(presentation.mode).toBe('exact');
    if (presentation.mode !== 'exact') throw new Error('expected exact intervals');
    expect(presentation.bars.length).toBeLessThanOrEqual(1_000);
    expect(presentation.bars.every((bar) => !bar.merged)).toBe(true);
    expect(presentation.bars).toEqual(
      layout.bars.filter((bar) => bar.x1 >= 0 && bar.x0 <= 0.1),
    );
  });

  it('keeps ordinary customer loads exact at the full-day view', () => {
    const normal = buildOccupancyPresentation(buildLayout(normalWeek), { visibleSpan: [0, 1] });
    const dense = buildOccupancyPresentation(buildLayout(denseWeek), { visibleSpan: [0, 1] });

    expect(normal.mode).toBe('exact');
    expect(dense.mode).toBe('exact');
  });

  it('is idempotent at a fixed viewport', () => {
    const once = reduceOccupancyLayout(buildLayout(worstCase), fullWeek);
    const twice = reduceOccupancyLayout(once, fullWeek);

    expect(twice).toEqual(once);
  });

  it('preserves every source interval and never merges across a row or series', () => {
    const layout = buildLayout(worstCase);
    const sourceKey = new Map(layout.bars.map((bar) => [bar.interval, `${bar.seriesIndex}:${bar.row}`]));
    const sourceIntervals = new Set(layout.bars.map((bar) => bar.interval));
    const reduced = reduceOccupancyLayout(layout, fullWeek);
    const represented = reduced.bars.flatMap((bar) => occupancyLayoutBarIntervals(bar));

    expect(represented).toHaveLength(layout.bars.length);
    expect(new Set(represented).size).toBe(sourceIntervals.size);
    expect(represented.every((interval) => sourceIntervals.has(interval))).toBe(true);
    for (const bar of reduced.bars) {
      expect(new Set(occupancyLayoutBarIntervals(bar).map((interval) => sourceKey.get(interval)))).toEqual(
        new Set([`${bar.seriesIndex}:${bar.row}`]),
      );
    }
  });

  it.each([overnight, daylightSaving, daylightSavingFallBack])(
    'reduces $name deterministically without changing covered time',
    (fixture) => {
      const layout = buildLayout(fixture);
      const reduced = reduceOccupancyLayout(layout, fullWeek);
      const duration = (bars: typeof layout.bars) =>
        bars.flatMap((bar) => occupancyLayoutBarIntervals(bar)).reduce(
          (total, interval) => total + interval.exit - interval.enter,
          0,
        );

      expect(duration(reduced.bars)).toBe(duration(layout.bars));
      expect(reduceOccupancyLayout(buildLayout(fixture), fullWeek)).toEqual(reduced);
    },
  );

  it('generates the exact original tooltip list lazily for a merged bar', () => {
    const layout = buildLayout(worstCase);
    const merged = reduceOccupancyLayout(layout, fullWeek).bars.find((bar) => bar.merged);

    expect(merged).toBeDefined();
    const tooltips = occupancyLayoutBarTooltips(merged!, layout.zone);
    expect(tooltips).toHaveLength(merged!.merged!.length);
    expect(tooltips[0]).toMatch(/^2026-08-08  \|  /);
    expect(tooltips[0]).toContain('No. of people:');
  });

  it('returns the original layout when every bar is wider than a pixel', () => {
    const layout = buildLayout(worstCase);

    expect(reduceOccupancyLayout(layout, { visibleSpan: [0, 1], plotWidthPx: 10_000 })).toBe(layout);
  });
});
