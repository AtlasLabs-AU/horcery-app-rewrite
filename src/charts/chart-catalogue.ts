export interface ObservationPoint {
  /** Unix milliseconds. Presentation chooses the axis grammar for the supplied zone. */
  at: number;
  /** `null` is an observed gap. Renderers must not connect or invent it. */
  value: number | null;
}

export interface ObservationSeries {
  id: string;
  label: string;
  points: readonly ObservationPoint[];
}

export interface ContinuousObservationChart {
  kind: 'continuous';
  title: string;
  zone: string;
  unit: string;
  threshold: number;
  series: readonly ObservationSeries[];
}

export interface MixedCategory {
  key: string;
  label: string;
  stacked: Readonly<Record<string, number>>;
  line: number | null;
  marker: { label: string; value: number } | null;
}

export interface MixedObservationChart {
  kind: 'mixed';
  title: string;
  unit: string;
  stackOrder: readonly string[];
  categories: readonly MixedCategory[];
}

export interface CompactSummaryChart {
  kind: 'compact';
  title: string;
  value: number | null;
  min: number;
  max: number;
  unit: string;
}

export interface ContinuousSegment {
  seriesId: string;
  points: readonly { at: number; value: number }[];
}

export type CatalogueChart =
  | ContinuousObservationChart
  | MixedObservationChart
  | CompactSummaryChart;

const HOUR_MS = 60 * 60 * 1000;

function deterministicValue(index: number, phase: number): number {
  return Math.round((68 + Math.sin((index + phase) / 7) * 9 + (index % 11) / 10) * 10) / 10;
}

export function buildContinuousFixture(pointCount: number): ContinuousObservationChart {
  if (!Number.isInteger(pointCount) || pointCount < 2) {
    throw new RangeError('pointCount must be an integer greater than one');
  }
  const start = Date.parse('2026-08-10T00:00:00.000Z');
  const step = (6 * HOUR_MS) / (pointCount - 1);
  const points = (phase: number, gapEvery: number, offsetFraction = 0) =>
    Array.from({ length: pointCount }, (_, index): ObservationPoint => ({
      // Real sensors do not report in lock-step. Keep the shared endpoints but
      // offset interior readings so adapters cannot safely join series by
      // array position.
      at: Math.round(
        start + step * index + (index > 0 && index < pointCount - 1 ? step * offsetFraction : 0),
      ),
      value: index > 0 && index < pointCount - 1 && index % gapEvery === 0
        ? null
        : deterministicValue(index, phase),
    }));

  return {
    kind: 'continuous',
    title: 'Ambient temperature',
    zone: 'America/Chicago',
    unit: '°F',
    threshold: 75,
    series: [
      { id: 'stall', label: 'Stall', points: points(0, 17) },
      { id: 'barn', label: 'Barn', points: points(3, 29, 0.25) },
    ],
  };
}

export const CONTINUOUS_NORMAL = buildContinuousFixture(72);

export const MIXED_OBSERVATIONS: MixedObservationChart = {
  kind: 'mixed',
  title: 'Feed, water and refill events',
  unit: 'kg',
  stackOrder: ['consumed', 'remaining'],
  categories: Array.from({ length: 12 }, (_, index): MixedCategory => ({
    key: `2026-${String(index + 1).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
      new Date(Date.UTC(2026, index, 1)),
    ),
    stacked: {
      consumed: 12 + (index % 4) * 2,
      remaining: 6 + ((index * 3) % 5),
    },
    // Missing really means missing; it is not zero and must not be joined.
    line: index === 5 ? null : 18 + Math.round(Math.sin(index / 2) * 4),
    marker: index === 3 || index === 9
      ? { label: index === 3 ? 'Refill' : 'Service', value: 24 + index }
      : null,
  })),
};

export const COMPACT_SUMMARY: CompactSummaryChart = {
  kind: 'compact',
  title: 'Daily water target',
  value: 68.2,
  min: 0,
  max: 100,
  unit: '%',
};

export const COMPACT_NO_DATA: CompactSummaryChart = {
  ...COMPACT_SUMMARY,
  value: null,
};

/** Split at every missing observation so a renderer cannot bridge a gap. */
export function continuousSegments(chart: ContinuousObservationChart): ContinuousSegment[] {
  const segments: ContinuousSegment[] = [];
  for (const series of chart.series) {
    let run: { at: number; value: number }[] = [];
    const flush = () => {
      if (run.length > 0) segments.push({ seriesId: series.id, points: run });
      run = [];
    };
    for (const point of series.points) {
      if (point.value === null) flush();
      else run.push({ at: point.at, value: point.value });
    }
    flush();
  }
  return segments;
}

export function mixedCategoryTooltip(chart: MixedObservationChart, category: MixedCategory): string {
  const stackLines = chart.stackOrder.map(
    (key) => `${key[0]!.toUpperCase()}${key.slice(1)}: ${category.stacked[key] ?? 0} ${chart.unit}`,
  );
  return [
    category.label,
    ...stackLines,
    `Target: ${category.line === null ? 'No reading' : `${category.line} ${chart.unit}`}`,
    ...(category.marker ? [`${category.marker.label}: ${category.marker.value} ${chart.unit}`] : []),
  ].join('\n');
}

/**
 * One truthful value domain for both renderers. Stacked bars start at zero and
 * the upper bound includes every stack, line and marker, rounded to a readable
 * five-unit step so library defaults cannot change the comparison.
 */
export function mixedValueDomain(chart: MixedObservationChart): [number, number] {
  const values = chart.categories.flatMap((category) => [
    chart.stackOrder.reduce((total, key) => total + (category.stacked[key] ?? 0), 0),
    category.line ?? 0,
    category.marker?.value ?? 0,
  ]);
  const maximum = Math.max(0, ...values);
  return [0, Math.max(5, Math.ceil(maximum / 5) * 5)];
}

export function compactFraction(chart: CompactSummaryChart): number | null {
  if (chart.value === null) return null;
  if (!(chart.max > chart.min)) throw new RangeError('compact summary max must be greater than min');
  return Math.min(1, Math.max(0, (chart.value - chart.min) / (chart.max - chart.min)));
}
