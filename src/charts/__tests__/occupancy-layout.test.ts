import { DateTime } from 'luxon';

import {
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
