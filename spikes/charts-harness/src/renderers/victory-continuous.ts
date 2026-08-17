import {
  continuousSegments,
  type ContinuousObservationChart,
} from '../../../../src/charts/chart-catalogue.ts';

export interface VictoryContinuousLine {
  seriesId: string;
  seriesLabel: string;
  points: readonly { at: number; value: number }[];
}

export interface VictoryContinuousDatum {
  x: number;
  domainValue: number;
  [key: string]: number;
}

export interface VictoryContinuousTable {
  data: VictoryContinuousDatum[];
  lines: VictoryContinuousLine[];
}

/**
 * Convert independently sampled series into Victory's shared-x table without
 * changing their timestamps or bridging explicit null gaps.
 *
 * Victory receives one O(n) domain series for scales and axes. Each genuine
 * continuous run remains a separate path, so independently sampled sensors do
 * not acquire fake values and explicit null readings are never bridged.
 */
export function buildVictoryContinuousTable(
  chart: ContinuousObservationChart,
): VictoryContinuousTable {
  const labels = new Map(chart.series.map((series) => [series.id, series.label]));
  const lines = continuousSegments(chart).map((segment) => ({
      seriesId: segment.seriesId,
      seriesLabel: labels.get(segment.seriesId) ?? segment.seriesId,
      points: segment.points,
    }));
  const data = lines
    .flatMap((line) => line.points.map((point) => ({ x: point.at, domainValue: point.value })))
    .sort((left, right) => left.x - right.x);

  if (data.length > 0) {
    data.push(
      { x: data[0]!.x, domainValue: chart.threshold },
      { x: data[data.length - 1]!.x, domainValue: chart.threshold },
    );
  }

  return {
    data,
    lines,
  };
}
