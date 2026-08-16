import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export interface PreviewChartSeries {
  label: string;
  color: string;
  values: readonly number[];
}

/**
 * Stands in for a chart while the charting-library decision is parked.
 * Same size and position as the real chart so the page's layout is honest;
 * reproduces the current app's own "No data available" state.
 */
export function ChartPlaceholder({
  height = 148,
  message = 'No data available',
  legend,
  previewSeries,
  xLabels,
  testID,
}: {
  height?: number;
  message?: string;
  legend?: { label: string; color: string }[];
  /** Development-only values used to review the chart's occupied layout. */
  previewSeries?: readonly PreviewChartSeries[];
  xLabels?: readonly string[];
  testID?: string;
}) {
  const { colors } = useTokens();
  const populated = !!previewSeries?.some((series) => series.values.length > 0);
  return (
    <View
      style={[styles.surface, { minHeight: height, backgroundColor: colors.background }]}
      testID={testID}>
      {populated ? (
        <PreviewBars series={previewSeries ?? []} labels={xLabels} height={height} />
      ) : (
        <Text style={[type.subhead, { color: colors.tertiary }]}>{message}</Text>
      )}
      {legend?.length ? (
        <View style={styles.legendRow}>
          {legend.map((entry) => (
            <View key={entry.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
              <Text style={[type.footnote, { color: colors.secondary }]}>{entry.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A deliberately small, dependency-free preview renderer. It is not the
 * production chart implementation: it only proves spacing and information
 * density while the measured chart-library spike remains open.
 */
function PreviewBars({
  series,
  labels,
  height,
}: {
  series: readonly PreviewChartSeries[];
  labels?: readonly string[];
  height: number;
}) {
  const { colors } = useTokens();
  const pointCount = Math.max(...series.map((item) => item.values.length), 0);
  const maximum = Math.max(...series.flatMap((item) => item.values), 1);
  const plotHeight = Math.max(height - space.xxl, space.xxl);

  return (
    <View style={styles.previewChart} testID="for-you-preview-chart">
      <View style={[styles.guide, styles.guideTop, { backgroundColor: colors.divider }]} />
      <View style={[styles.guide, styles.guideMiddle, { backgroundColor: colors.divider }]} />
      <View style={styles.barRow}>
        {Array.from({ length: pointCount }).map((_, pointIndex) => (
          <View key={pointIndex} style={styles.barPoint}>
            <View style={[styles.barGroup, { height: plotHeight }]}>
              {series.map((item) => {
                const value = item.values[pointIndex] ?? 0;
                return (
                  <View
                    key={item.label}
                    style={[
                      styles.bar,
                      {
                        height: Math.max(space.xs, (value / maximum) * plotHeight),
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <Text style={[type.caption, { color: colors.tertiary }]} numberOfLines={1}>
              {labels?.[pointIndex] ?? ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    marginTop: space.edge,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: space.edge,
  },
  previewChart: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: space.sm,
    paddingTop: space.md,
  },
  guide: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    height: StyleSheet.hairlineWidth,
  },
  guideTop: { top: space.lg },
  guideMiddle: { top: '50%' },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.xs,
  },
  barPoint: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: space.xxs,
  },
  bar: {
    width: space.sm,
    borderRadius: radius.xs,
    borderCurve: 'continuous',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
});
