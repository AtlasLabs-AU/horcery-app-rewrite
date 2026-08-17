import { matchFont, Path, Skia } from '@shopify/react-native-skia';
import { DateTime } from 'luxon';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CartesianChart,
  Line,
  Pie,
  PolarChart,
  Scatter,
  StackedBar,
  useChartTransformState,
} from 'victory-native';

import {
  compactFraction,
  mixedCategoryTooltip,
  type CompactSummaryChart,
  type ContinuousObservationChart,
  type MixedObservationChart,
} from '@/charts/chart-catalogue';

import type { CatalogueRendererProps } from '../catalogue-renderer';
import { buildVictoryContinuousTable } from './victory-continuous';

const COLORS = ['#0369A1', '#7DD3FC', '#F59E0B', '#7C3AED'];
const font = matchFont({ fontFamily: 'sans-serif', fontSize: 11 });

function ContinuousChart({ chart, width, height }: { chart: ContinuousObservationChart; width: number; height: number }) {
  const { state: transform } = useChartTransformState();
  const table = useMemo(() => buildVictoryContinuousTable(chart), [chart]);
  const seriesColors = new Map(chart.series.map((series, index) => [series.id, COLORS[index % COLORS.length]!]));

  return (
    <View style={{ width, height }}>
      <View style={styles.legend}>
        {chart.series.map((series, index) => (
          <View key={series.id} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: COLORS[index % COLORS.length] }]} />
            <Text style={styles.legendText}>{series.label}</Text>
          </View>
        ))}
      </View>
      <CartesianChart
        data={table.data}
        xKey="x"
        yKeys={['domainValue']}
        domainPadding={{ top: 12, bottom: 12 }}
        padding={{ left: 8, right: 8, top: 10, bottom: 20 }}
        transformState={transform}
        transformConfig={{ pinch: { dimensions: 'x' }, pan: { dimensions: 'x' } }}
        xAxis={{
          font,
          tickCount: 5,
          formatXLabel: (value) => DateTime.fromMillis(Number(value), { zone: chart.zone }).toFormat('h a'),
          labelColor: '#64748B',
          lineWidth: 0,
        }}
        yAxis={[{
          font,
          tickCount: 5,
          formatYLabel: (value) => `${value} ${chart.unit}`,
          labelColor: '#64748B',
          lineColor: '#f1f5f9',
        }]}
        explicitSize={{ width, height: height - 24 }}>
        {({ xScale, yScale, chartBounds }) => {
          const threshold = Skia.Path.Make();
          threshold.moveTo(chartBounds.left, yScale(chart.threshold));
          threshold.lineTo(chartBounds.right, yScale(chart.threshold));
          return (
            <>
              {table.lines.map((line, index) => {
                const path = Skia.Path.Make();
                line.points.forEach((point, pointIndex) => {
                  const x = xScale(point.at);
                  const y = yScale(point.value);
                  if (pointIndex === 0) path.moveTo(x, y);
                  else path.lineTo(x, y);
                });
                return (
                  <Path
                    key={`${line.seriesId}-${index}`}
                    path={path}
                    color={seriesColors.get(line.seriesId)!}
                    style="stroke"
                    strokeWidth={2}
                  />
                );
              })}
              <Path path={threshold} color="#DC2626" style="stroke" strokeWidth={1} />
            </>
          );
        }}
      </CartesianChart>
    </View>
  );
}

function MixedChart({ chart, width, height }: { chart: MixedObservationChart; width: number; height: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const data = useMemo(
    () => chart.categories.map((category, index) => ({
      x: index,
      consumed: category.stacked.consumed ?? 0,
      remaining: category.stacked.remaining ?? 0,
      target: category.line,
      marker: category.marker?.value ?? null,
    })),
    [chart],
  );

  return (
    <View style={{ width, height }}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Mixed observations chart. Tap a month for exact values."
        onPress={(event) => {
          const plotLeft = 42;
          const plotWidth = Math.max(1, width - plotLeft - 8);
          const index = Math.round(((event.nativeEvent.locationX - plotLeft) / plotWidth) * (chart.categories.length - 1));
          setSelected(Math.max(0, Math.min(chart.categories.length - 1, index)));
        }}>
        <CartesianChart
          data={data}
          xKey="x"
          yKeys={['consumed', 'remaining', 'target', 'marker']}
          padding={{ left: 8, right: 8, top: 10, bottom: 20 }}
          xAxis={{
            font,
            tickValues: chart.categories.map((_, index) => index),
            tickCount: chart.categories.length,
            formatXLabel: (value) => chart.categories[Math.round(Number(value))]?.label ?? '',
            labelColor: '#64748B',
            lineWidth: 0,
          }}
          yAxis={[{ font, tickCount: 5, labelColor: '#64748B', lineColor: '#f1f5f9' }]}
          explicitSize={{ width, height }}>
          {({ points, chartBounds }) => (
            <>
              <StackedBar
                points={[points.consumed, points.remaining]}
                chartBounds={chartBounds}
                colors={[COLORS[0], COLORS[1]]}
                innerPadding={0.3}
              />
              <Line points={points.target} color={COLORS[2]} strokeWidth={2} connectMissingData={false} />
              <Scatter points={points.marker} color={COLORS[3]} radius={5} />
            </>
          )}
        </CartesianChart>
      </Pressable>
      {selected !== null ? (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText}>{mixedCategoryTooltip(chart, chart.categories[selected]!)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CompactChart({ chart, width, height }: { chart: CompactSummaryChart; width: number; height: number }) {
  const fraction = compactFraction(chart);
  if (fraction === null) {
    return (
      <View style={[styles.noData, { width, height }]}>
        <Text style={styles.noDataText}>No Data Available</Text>
      </View>
    );
  }
  const data = [
    { label: 'Value', value: fraction, color: COLORS[0] },
    { label: 'Remaining', value: 1 - fraction, color: '#E2E8F0' },
  ];
  return (
    <View style={{ width, height }}>
      <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color" explicitSize={{ width, height }}>
        <Pie.Chart innerRadius="72%" startAngle={-210} circleSweepDegrees={240} />
      </PolarChart>
      <View style={styles.compactLabel} pointerEvents="none">
        <Text style={styles.compactValue}>{chart.value} {chart.unit}</Text>
        <Text style={styles.compactTitle}>{chart.title}</Text>
      </View>
    </View>
  );
}

export const VictoryCatalogue = memo(function VictoryCatalogue(props: CatalogueRendererProps) {
  const started = useMemo(() => performance.now(), [props.chart]);
  const onLayout = () => props.onRenderSignal?.({
    source: 'victory-layout',
    elapsedMs: performance.now() - started,
  });
  return (
    <View style={{ width: props.width, height: props.height }} onLayout={onLayout}>
      {props.chart.kind === 'continuous' ? <ContinuousChart chart={props.chart} width={props.width} height={props.height} /> : null}
      {props.chart.kind === 'mixed' ? <MixedChart chart={props.chart} width={props.width} height={props.height} /> : null}
      {props.chart.kind === 'compact' ? <CompactChart chart={props.chart} width={props.width} height={props.height} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  legend: { height: 24, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 3, borderRadius: 2 },
  legendText: { color: '#64748B', fontSize: 11 },
  tooltip: { position: 'absolute', left: 48, top: 22, backgroundColor: '#ffffff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  tooltipText: { color: '#0f172a', fontSize: 12 },
  noData: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  noDataText: { color: '#64748B', fontSize: 14 },
  compactLabel: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 34 },
  compactValue: { color: '#0F172A', fontSize: 24, fontWeight: '600', fontVariant: ['tabular-nums'] },
  compactTitle: { color: '#64748B', fontSize: 12, marginTop: 4 },
});
