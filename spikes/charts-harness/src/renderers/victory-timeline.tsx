import { Group, matchFont, rect, RoundedRect, Text as SkiaText } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import {
  CartesianChart,
  useCartesianTransformContext,
  useChartPressState,
  useChartTransformState,
  type Scale,
} from 'victory-native';

import {
  dayLabel,
  hourTicks,
  intervalTooltip,
  positionInDay,
  type OccupancyTimeline,
} from '@/charts/occupancy-timeline';

import type { RendererProps } from '../renderer';
import { GEOMETRY, seriesColor, seriesLabel } from '../scenarios';

/**
 * Victory Native (Skia). The challenger.
 *
 * Victory is built around data points, not intervals, so the chart is used as
 * a coordinate system: `data` only fixes the domain (x 0..1, y 0..rows), and
 * every bar is drawn by hand with Skia from the domain model.
 *
 * Zoom is Victory's transform state (pinch + pan on x). Two honest choices had
 * to be made and are worth knowing when reading the numbers:
 *
 * 1. Bars are drawn OUTSIDE the transformed canvas group and re-laid-out from
 *    the rescaled x-axis on each transform update. Drawing them inside the
 *    matrix group would be cheaper (pure UI-thread), but a horizontal matrix
 *    scale stretches corner radii into ellipses and breaks the 1 px minimum
 *    width — geometry the catalogue requires. So this path costs a React
 *    re-render per transform tick, and that cost is real and measured.
 * 2. Victory has no built-in zoom limits. The 10 %–100 % span rule is applied
 *    by clamping the transform after each gesture; during a gesture the user
 *    can briefly overshoot. ECharts enforces it natively via dataZoom.
 *
 * Tooltip: press position from useChartPressState → hit-test in JS → an RN
 * View 40 px above the finger, hidden after 2 s.
 */

const TICKS = hourTicks();
const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 12,
});

interface Bar {
  row: number;
  start: number;
  end: number;
  color: string;
  tooltip: string;
}

function flatten(timeline: OccupancyTimeline): Bar[] {
  const bars: Bar[] = [];
  const { zone, days } = timeline;
  for (const s of timeline.series) {
    const color = seriesColor(s.id);
    days.forEach((day, row) => {
      for (const iv of s.intervalsByDay[day.key] ?? []) {
        bars.push({
          row,
          start: positionInDay(iv.enter, day, zone),
          end: positionInDay(iv.exit, day, zone),
          color,
          tooltip: intervalTooltip(iv, zone),
        });
      }
    });
  }
  return bars;
}

/** Bars, re-laid-out from the zoomed x-scale. Lives inside the chart so it can read the transform. */
function Bars({
  bars,
  rows,
  xScale,
  yScale,
  bounds,
}: {
  bars: Bar[];
  rows: number;
  xScale: Scale;
  yScale: Scale;
  bounds: { left: number; right: number; top: number; bottom: number };
}) {
  const t = useCartesianTransformContext();
  // Same maths Victory uses for its own axes: apply the pan/zoom to the scale.
  const zoomed = useMemo(() => {
    const domain = xScale.domain();
    const range = xScale.range();
    const invert = (px: number) => xScale.invert((px - t.tx) / t.k);
    const s = xScale.copy();
    s.domain([invert(range[0]!), invert(range[1]!)]);
    void domain;
    return s;
  }, [xScale, t.k, t.tx]);

  const clip = rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  const half = GEOMETRY.barHeight / 2;

  return (
    <Group clip={clip}>
      {bars.map((b, i) => {
        const x0 = zoomed(b.start);
        const x1 = zoomed(b.end);
        if (x1 < bounds.left || x0 > bounds.right) return null; // off-screen when zoomed
        // Oldest row on top: row 0 → the highest y value.
        const cy = yScale(rows - 0.5 - b.row);
        return (
          <RoundedRect
            key={i}
            x={x0}
            y={cy - half}
            width={Math.max(x1 - x0, GEOMETRY.barMinWidth)}
            height={GEOMETRY.barHeight}
            r={GEOMETRY.barRadius}
            color={b.color}
          />
        );
      })}
    </Group>
  );
}

export function VictoryTimeline({ timeline, width, height, onFirstPaint }: RendererProps) {
  const rows = timeline?.days.length ?? 7;
  const bars = useMemo(() => (timeline ? flatten(timeline) : []), [timeline]);
  const labels = useMemo(
    () => (timeline ? timeline.days.map((d) => dayLabel(d, timeline.zone)) : []),
    [timeline],
  );

  const { state: transform } = useChartTransformState();
  const { state: press } = useChartPressState({ x: 0, y: { y: 0 } });
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [firstPaintAt] = useState(() => performance.now());

  useEffect(() => {
    // Skia has no "finished" event; the first commit after mount is the
    // closest honest proxy. Measured the same way for both back-ends' mount.
    const id = requestAnimationFrame(() => onFirstPaint?.(performance.now() - firstPaintAt));
    return () => cancelAnimationFrame(id);
  }, [firstPaintAt, onFirstPaint, timeline]);

  // Zoom limits — enforced after the gesture (see header note 2).
  useAnimatedReaction(
    () => ({ active: transform.zoomActive.value || transform.panActive.value, m: transform.matrix.value }),
    ({ active, m }) => {
      if (active) return;
      const k = m[0] ?? 1; // scaleX in a column-major Matrix4
      const maxK = 1 / GEOMETRY.zoomMinSpan;
      if (k < 1 || k > maxK) {
        const clamped = Math.min(Math.max(k, 1), maxK);
        const next = [...m] as unknown as number[];
        next[0] = clamped;
        if (clamped === 1) next[12] = 0; // fully zoomed out: no pan offset either
        transform.matrix.value = next as unknown as typeof m;
        transform.offset.value = next as unknown as typeof m;
      }
    },
  );

  // Tap → tooltip. Hit-test in JS against the un-transformed positions.
  const showTooltipAt = (px: number, py: number, xVal: number, yVal: number) => {
    const row = Math.floor(rows - yVal);
    const hit = bars.find((b) => b.row === row && xVal >= b.start && xVal <= b.end);
    if (!hit) return;
    setTooltip({ text: hit.tooltip, x: px, y: py });
  };
  useAnimatedReaction(
    () => ({ on: press.isActive.value, px: press.x.position.value, py: press.y.y.position.value, xv: press.x.value.value, yv: press.y.y.value.value }),
    (cur, prev) => {
      if (cur.on && !prev?.on) runOnJS(showTooltipAt)(cur.px, cur.py, cur.xv as number, cur.yv);
    },
  );
  useEffect(() => {
    if (!tooltip) return;
    const id = setTimeout(() => setTooltip(null), GEOMETRY.tooltipHideMs);
    return () => clearTimeout(id);
  }, [tooltip]);

  if (!timeline) {
    return (
      <View style={[styles.noData, { width, height: height - 30 }]}>
        <Text style={styles.noDataText}>No Data Available</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <CartesianChart
        data={[{ x: 0, y: 0 }, { x: 1, y: rows }]}
        xKey="x"
        yKeys={['y']}
        domain={{ x: [0, 1], y: [0, rows] }}
        padding={{ left: 8, right: 8, top: 8, bottom: 28 }}
        transformState={transform}
        transformConfig={{ pinch: { dimensions: 'x' }, pan: { dimensions: 'x' } }}
        chartPressState={press}
        xAxis={{
          font,
          tickValues: TICKS.map((t) => t.position),
          formatXLabel: (v) => TICKS[Math.round(Number(v) * 24)]?.label ?? '',
          labelColor: GEOMETRY.axisText,
          lineWidth: 0,
          enableRescaling: true,
        }}
        yAxis={[
          {
            font,
            tickValues: labels.map((_, i) => rows - 0.5 - i),
            formatYLabel: (v) => labels[Math.round(rows - 0.5 - Number(v))] ?? '',
            labelColor: GEOMETRY.axisText,
            lineWidth: 1,
            lineColor: GEOMETRY.rowGuide,
          },
        ]}
        renderOutside={({ xScale, yScale, chartBounds }) => (
          <Bars bars={bars} rows={rows} xScale={xScale} yScale={yScale} bounds={chartBounds} />
        )}>
        {() => null}
      </CartesianChart>

      <View style={styles.legend} pointerEvents="none">
        {timeline.series.map((s) => (
          <View key={s.id} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: seriesColor(s.id) }]} />
            <Text style={styles.legendText}>{seriesLabel(s.id)}</Text>
          </View>
        ))}
      </View>

      {tooltip ? (
        <View style={[styles.tooltip, { left: Math.min(tooltip.x, width - 190), top: Math.max(0, tooltip.y - 40) }]} pointerEvents="none">
          <Text style={styles.tooltipText}>{tooltip.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Keep Skia's text import referenced for renderers that add in-canvas labels.
void SkiaText;

const styles = StyleSheet.create({
  noData: { borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  noDataText: { color: GEOMETRY.axisText, fontSize: 14 },
  legend: { position: 'absolute', bottom: 2, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: GEOMETRY.legendSwatch, height: GEOMETRY.legendSwatch, borderRadius: GEOMETRY.legendSwatch / 2 },
  legendText: { color: GEOMETRY.legendText, fontSize: 12 },
  tooltip: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  tooltipText: { color: '#0f172a', fontSize: 13 },
});
