import {
  DashPathEffect,
  Path,
  RoundedRect,
  Skia,
} from '@shopify/react-native-skia';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bar, CartesianChart, Line, Scatter } from 'victory-native';

import {
  sampleUsualCurve,
  type LyingDownWeeklySummary,
  type UsualCurvePoint,
  type Verdict,
} from '@/charts/lying-down';
import type { TokenColors } from '@/constants/tokens';

import { lyingDownSeriesColor } from './lying-down-badge';

const DAILY_HEIGHT = 60;
const WEEKLY_HEIGHT = 56;
const REFERENCE_SAMPLES = 24;
const BAR_WIDTH_RATIO = 0.46;
const MARKER_OVERHANG = 4;

/**
 * Suppresses Victory's default chart chrome.
 *
 * `CartesianChart` renders a y-axis whether or not one is asked for, and that
 * axis draws a hairline rule across the plot at every tick — the faint
 * horizontals seen inside both plots. The x-axis and frame are only drawn when
 * their props are supplied, so they stay off simply by not being passed.
 *
 * They are unwanted: the row prints its own time axis as text beneath the plot,
 * and PRINCIPLES.md's editorial direction keeps chrome from competing with the
 * reading. `lineWidth: 0` drops the rules and `tickCount: 0` drops the ticks
 * that generate them. Both plots pass an explicit `domain`, so removing the
 * ticks changes no scaling — only the decoration goes.
 */
const NO_GRID_Y_AXIS = [{ lineWidth: 0, tickCount: 0 }];

/**
 * The only renderer-specific boundary for both lying-down views.
 *
 * Victory owns chart scaling and the standard line/bar primitives. Skia is
 * used only for the two shapes Victory does not express: a dashed reference
 * curve and hollow bars that distinguish incomplete or unobserved days.
 */
export function VictoryLyingDownDailyPlot({
  points,
  usualCurve,
  averageSeconds,
  ceiling,
  verdict,
  width,
  colors,
}: {
  points: { f: number; seconds: number }[];
  usualCurve?: UsualCurvePoint[];
  averageSeconds: number | null;
  ceiling: number;
  verdict: Verdict;
  width: number;
  colors: TokenColors;
}) {
  const hasReading = points.length > 0;
  const data: { f: number; reading: number }[] =
    points.length > 0
      ? points.map((point) => ({ f: point.f, reading: point.seconds }))
      : [
          { f: 0, reading: 0 },
          { f: 1, reading: 0 },
        ];

  return (
    <View
      testID="lying-down-daily-plot"
      style={[styles.plot, { width, height: DAILY_HEIGHT, backgroundColor: colors.background }]}>
      <CartesianChart
        data={data}
        xKey="f"
        yKeys={['reading']}
        domain={{ x: [0, 1], y: [0, ceiling] }}
        yAxis={NO_GRID_Y_AXIS}
        explicitSize={{ width, height: DAILY_HEIGHT }}>
        {({ points: chartPoints, xScale, yScale, chartBounds }) => {
          const referenceBuilder = Skia.PathBuilder.Make();
          if (usualCurve && usualCurve.length > 1) {
            for (let index = 0; index < REFERENCE_SAMPLES; index += 1) {
              const f = index / (REFERENCE_SAMPLES - 1);
              const { low, high } = sampleUsualCurve(usualCurve, f);
              const x = xScale(f);
              const y = yScale((low + high) / 2);
              if (index === 0) referenceBuilder.moveTo(x, y);
              else referenceBuilder.lineTo(x, y);
            }
          } else if (averageSeconds !== null) {
            referenceBuilder.moveTo(chartBounds.left, yScale(averageSeconds));
            referenceBuilder.lineTo(chartBounds.right, yScale(averageSeconds));
          }
          const hasReference = !referenceBuilder.isEmpty();
          const reference = referenceBuilder.detach();

          const reading = (hasReading ? chartPoints.reading : []).filter(
            (point): point is typeof point & { y: number; yValue: number } =>
              point.y !== null && point.yValue !== null,
          );
          const last = reading.at(-1);

          return (
            <>
              {hasReference ? (
                <Path
                  path={reference}
                  color={colors.chartReference}
                  style="stroke"
                  strokeWidth={1.5}>
                  <DashPathEffect intervals={[8, 6]} />
                </Path>
              ) : null}
              {reading.length > 1 ? (
                <Line
                  points={reading}
                  color={lyingDownSeriesColor(verdict, colors)}
                  strokeWidth={3}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ) : null}
              {last ? (
                <Scatter
                  points={[last]}
                  color={lyingDownSeriesColor(verdict, colors)}
                  radius={4}
                />
              ) : null}
            </>
          );
        }}
      </CartesianChart>
    </View>
  );
}

export function VictoryLyingDownWeeklyPlot({
  summary,
  width,
  colors,
}: {
  summary: LyingDownWeeklySummary;
  width: number;
  colors: TokenColors;
}) {
  const peak =
    Math.max(
      ...summary.days.flatMap((day) => [day.totalSeconds ?? 0, day.usualSeconds ?? 0]),
      30 * 60,
    ) * 1.15;
  const columnWidth = width / summary.days.length;
  const barWidth = Math.max(6, columnWidth * BAR_WIDTH_RATIO);
  const data = summary.days.map((day, index) => ({
    index,
    completed: day.isToday ? null : day.totalSeconds,
  }));

  return (
    <View testID="lying-down-weekly-plot" style={{ width, height: WEEKLY_HEIGHT }}>
      <CartesianChart
        data={data}
        xKey="index"
        yKeys={['completed']}
        domain={{ x: [-0.5, summary.days.length - 0.5], y: [0, peak] }}
        yAxis={NO_GRID_Y_AXIS}
        explicitSize={{ width, height: WEEKLY_HEIGHT }}>
        {({ points, xScale, yScale, chartBounds }) => (
          <>
            <Bar
              points={points.completed}
              chartBounds={chartBounds}
              barWidth={barWidth}
              color={colors.chartData}
              roundedCorners={{ topLeft: 3, topRight: 3 }}
            />

            {summary.days.map((day, index) => {
              const centre = xScale(index);
              const left = centre - barWidth / 2;
              const isMissing = day.totalSeconds === null;
              const outlineHeight = isMissing
                ? WEEKLY_HEIGHT
                : Math.max(2, chartBounds.bottom - yScale(day.totalSeconds));
              const outlineTop = chartBounds.bottom - outlineHeight;

              return (
                <Fragment key={day.key}>
                  {isMissing || day.isToday ? (
                    <RoundedRect
                      x={left}
                      y={outlineTop}
                      width={barWidth}
                      height={outlineHeight}
                      r={3}
                      color={isMissing ? colors.chartTrack : colors.chartData}
                      style="stroke"
                      strokeWidth={1.5}>
                      <DashPathEffect intervals={[4, 3]} />
                    </RoundedRect>
                  ) : null}

                  {day.usualSeconds !== null ? (() => {
                    const marker = Skia.PathBuilder.Make();
                    const markerY = yScale(day.usualSeconds);
                    marker.moveTo(left - MARKER_OVERHANG, markerY);
                    marker.lineTo(left + barWidth + MARKER_OVERHANG, markerY);
                    return (
                      <Path
                        path={marker.detach()}
                        color={isMissing ? colors.chartTrack : colors.chartReference}
                        style="stroke"
                        strokeWidth={2}
                      />
                    );
                  })() : null}
                </Fragment>
              );
            })}
          </>
        )}
      </CartesianChart>
    </View>
  );
}


const styles = StyleSheet.create({
  plot: { borderRadius: 6, overflow: 'hidden' },
});
