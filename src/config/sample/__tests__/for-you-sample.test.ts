import { SAMPLE_FOR_YOU } from '@/config/sample/for-you-sample';

describe('For You sample data', () => {
  it('has stable unique identities for every preview card', () => {
    const ids = [
      ...SAMPLE_FOR_YOU.snapshots.map((item) => item.id),
      ...SAMPLE_FOR_YOU.reviewEvents.map((item) => item.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every chart aligned to the same visible labels', () => {
    const expected = SAMPLE_FOR_YOU.chartLabels.length;
    const behaviorValues = Object.values(SAMPLE_FOR_YOU.behaviorTrends).flatMap(
      (trend) => [trend.daily, trend.weekly],
    );
    const intakeValues = [...SAMPLE_FOR_YOU.waterSeries, ...SAMPLE_FOR_YOU.feedSeries].map(
      (series) => series.values,
    );

    for (const values of [...behaviorValues, ...intakeValues]) {
      expect(values).toHaveLength(expected);
      expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    }
  });
});
