import {
  COMPACT_NO_DATA,
  COMPACT_SUMMARY,
  CONTINUOUS_NORMAL,
  MIXED_OBSERVATIONS,
  buildContinuousFixture,
  compactFraction,
  continuousSegments,
  mixedCategoryTooltip,
  mixedValueDomain,
} from '@/charts/chart-catalogue';

describe('whole-catalogue renderer-independent fixtures', () => {
  it('keeps the organization zone, units, threshold and exact point count', () => {
    expect(CONTINUOUS_NORMAL.zone).toBe('America/Chicago');
    expect(CONTINUOUS_NORMAL.unit).toBe('°F');
    expect(CONTINUOUS_NORMAL.threshold).toBe(75);
    expect(CONTINUOUS_NORMAL.series.map((series) => series.points.length)).toEqual([72, 72]);
    expect(CONTINUOUS_NORMAL.series[0]!.points[1]!.at).not.toBe(
      CONTINUOUS_NORMAL.series[1]!.points[1]!.at,
    );
  });

  it('splits continuous lines at missing readings rather than inventing values', () => {
    const segments = continuousSegments(CONTINUOUS_NORMAL);
    const stall = segments.filter((segment) => segment.seriesId === 'stall');
    const barn = segments.filter((segment) => segment.seriesId === 'barn');

    expect(stall).toHaveLength(5);
    expect(barn).toHaveLength(3);
    expect(segments.flatMap((segment) => segment.points).some((point) => point.value === null)).toBe(false);
    expect(segments.flatMap((segment) => segment.points)).toHaveLength(138);
  });

  it('provides a deterministic high-point fixture without changing semantics', () => {
    const highPoint = buildContinuousFixture(10_000);
    expect(highPoint.series).toHaveLength(2);
    expect(highPoint.series[0]!.points).toHaveLength(10_000);
    expect(highPoint.series[0]!.points[0]).toEqual(
      buildContinuousFixture(10_000).series[0]!.points[0],
    );
    const timestamps = highPoint.series[0]!.points.map((point) => point.at);
    expect(timestamps.every((value, index) => index === 0 || value > timestamps[index - 1]!)).toBe(true);
  });

  it('rejects invalid continuous fixture sizes', () => {
    expect(() => buildContinuousFixture(1)).toThrow(RangeError);
    expect(() => buildContinuousFixture(2.5)).toThrow(RangeError);
  });

  it('retains stacked values, sparse markers and a genuinely missing line value', () => {
    expect(MIXED_OBSERVATIONS.categories).toHaveLength(12);
    expect(MIXED_OBSERVATIONS.categories[5]!.line).toBeNull();
    expect(MIXED_OBSERVATIONS.categories.filter((category) => category.marker)).toHaveLength(2);
    expect(MIXED_OBSERVATIONS.categories[0]!.stacked).toEqual({ consumed: 12, remaining: 6 });
  });

  it('generates one exact joined tooltip without filling the missing line', () => {
    expect(mixedCategoryTooltip(MIXED_OBSERVATIONS, MIXED_OBSERVATIONS.categories[3]!)).toBe(
      'Apr\nConsumed: 18 kg\nRemaining: 10 kg\nTarget: 22 kg\nRefill: 27 kg',
    );
    expect(mixedCategoryTooltip(MIXED_OBSERVATIONS, MIXED_OBSERVATIONS.categories[5]!)).toContain(
      'Target: No reading',
    );
  });

  it('uses one zero-based mixed value domain that includes stacks, lines and markers', () => {
    expect(mixedValueDomain(MIXED_OBSERVATIONS)).toEqual([0, 35]);
    expect(mixedValueDomain({
      ...MIXED_OBSERVATIONS,
      categories: [{
        key: 'empty',
        label: 'Empty',
        stacked: {},
        line: null,
        marker: null,
      }],
    })).toEqual([0, 5]);
  });

  it('preserves exact compact-summary domain behavior and no-data meaning', () => {
    expect(compactFraction(COMPACT_SUMMARY)).toBeCloseTo(0.682, 10);
    expect(compactFraction(COMPACT_NO_DATA)).toBeNull();
    expect(compactFraction({ ...COMPACT_SUMMARY, value: 150 })).toBe(1);
    expect(compactFraction({ ...COMPACT_SUMMARY, value: -20 })).toBe(0);
    expect(() => compactFraction({ ...COMPACT_SUMMARY, min: 1, max: 1 })).toThrow(RangeError);
  });
});
