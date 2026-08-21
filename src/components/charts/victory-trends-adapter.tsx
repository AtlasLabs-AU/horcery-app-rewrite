import { StyleSheet, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import type { ActivenessDay } from '@/charts/horse-trends';
import type { TokenColors } from '@/constants/tokens';

import { NO_GRID_Y_AXIS } from './victory-lying-down-adapter';

/**
 * The Activeness trend line. Drawn as one Line PER CONTIGUOUS RUN of samples,
 * so the line visibly breaks where the monitor was silent — the legacy chart
 * bridges the silence, which is the missing-data-becomes-fact bug in line
 * form. The gaps themselves render as pale bands behind the plot.
 *
 * The y-axis is deliberately unlabelled: the query's unit has no approved name
 * (the shipping app multiplies by 1,000 and labels nothing). The line shows
 * shape — when the horse was more and less active — which is the customer
 * question; magnitudes wait for Data Science's unit.
 */

const HEIGHT = 88;

export function VictoryActivenessPlot({
  day,
  width,
  colors,
}: {
  day: ActivenessDay;
  width: number;
  colors: TokenColors;
}) {
  const span = day.windowEnd - day.windowStart;
  const f = (at: number) => (span <= 0 ? 0 : (at - day.windowStart) / span);

  // Split at the gaps so each run draws as its own line.
  const runs: { f: number; value: number }[][] = [];
  let current: { f: number; value: number }[] = [];
  for (const point of day.points) {
    const inGap = day.gaps.some((gap) => point.at > gap.from && point.at < gap.to);
    if (inGap) continue;
    const startsAfterGap = day.gaps.some((gap) => gap.to === point.at);
    if (startsAfterGap && current.length > 0) {
      runs.push(current);
      current = [];
    }
    current.push({ f: f(point.at), value: point.value });
  }
  if (current.length > 0) runs.push(current);

  const ceiling = Math.max(...day.points.map((point) => point.value), 0.1) * 1.15;

  return (
    <View style={[styles.plot, { width, height: HEIGHT, backgroundColor: colors.background }]}>
      {day.gaps.map((gap) => (
        <View
          key={`${gap.from}-${gap.to}`}
          testID="activeness-gap"
          style={{
            position: 'absolute',
            left: f(gap.from) * width,
            width: Math.max(2, (f(gap.to) - f(gap.from)) * width),
            top: 0,
            bottom: 0,
            backgroundColor: colors.chartBand,
          }}
        />
      ))}
      {runs.map((run, index) =>
        run.length > 1 ? (
          <View key={index} style={StyleSheet.absoluteFill}>
            <CartesianChart
              data={run}
              xKey="f"
              yKeys={['value']}
              domain={{ x: [0, 1], y: [0, ceiling] }}
              yAxis={NO_GRID_Y_AXIS}
              explicitSize={{ width, height: HEIGHT }}>
              {({ points }) => (
                <Line
                  points={points.value}
                  color={colors.chartData}
                  strokeWidth={2}
                  strokeCap="round"
                  strokeJoin="round"
                />
              )}
            </CartesianChart>
          </View>
        ) : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { borderRadius: 6, overflow: 'hidden' },
});
