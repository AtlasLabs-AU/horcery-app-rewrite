import { Group, matchFont, rect, RoundedRect, Text as SkiaText } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import {
  CartesianChart,
  useCartesianTransformContext,
  useChartTransformState,
  type Scale,
} from 'victory-native';

import {
  dayLabel,
  hourTicks,
  type OccupancyTimeline,
} from '@/charts/occupancy-timeline';
import {
  layoutOccupancyTimeline,
  occupancyLayoutBarTooltips,
  reduceOccupancyLayout,
  type OccupancyLayoutBar,
} from '@/charts/occupancy-layout';

import type { RendererProps, VictoryRenderMode } from '../renderer';
import { GEOMETRY, seriesColor, seriesLabel } from '../scenarios';

/**
 * Victory Native (Skia). The challenger.
 *
 * Victory is built around data points, not intervals, so the chart is used as
 * a coordinate system: `data` only fixes the domain (x 0..1, y 0..rows), and
 * every bar is drawn by hand with Skia from the domain model.
 *
 * Zoom is Victory's transform state (pinch + pan on x). The harness exposes
 * both honest rendering choices so Run 2 can measure rather than assume:
 *
 * 1. Bars are drawn OUTSIDE the transformed canvas group and re-laid-out from
 *    the rescaled x-axis on each transform update. Drawing them inside the
 *    matrix group would be cheaper (pure UI-thread), but a horizontal matrix
 *    scale stretches corner radii into ellipses and breaks the 1 px minimum
 *    width — geometry the catalogue requires. The `relayout` variant pays a
 *    React re-render per transform tick; `matrix` stays on the UI thread and
 *    accepts the radius/minimum-width distortion. Both costs are measured.
 * 2. Victory has no built-in zoom limits. The 10 %–100 % span rule is applied
 *    by clamping the transform after each gesture; during a gesture the user
 *    can briefly overshoot. ECharts enforces it natively via dataZoom.
 *
 * Tooltip: Victory's press state SNAPS to the nearest data point, and this
 * chart's data is two anchors that only fix the domain — so it cannot hit an
 * interval. The raw tap is taken with a gesture of our own, inverted through
 * the current zoom into a day fraction, and hit-tested in JS; the tooltip is an
 * RN View 40 px above the finger, hidden after 2 s. More adapter code Victory
 * needs that ECharts' `trigger: 'item'` gives for free.
 */

const TICKS = hourTicks();
const font = matchFont({
  fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }),
  fontSize: 12,
});

/** Bars, re-laid-out from the zoomed x-scale. Lives inside the chart so it can read the transform. */
function RelayoutBars({
  bars,
  seriesIds,
  rows,
  xScale,
  yScale,
  bounds,
}: {
  bars: OccupancyLayoutBar[];
  seriesIds: string[];
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
        const x0 = zoomed(b.x0);
        const x1 = zoomed(b.x1);
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
            color={seriesColor(seriesIds[b.seriesIndex] ?? '')}
          />
        );
      })}
    </Group>
  );
}

/**
 * Best reasonable Victory alternative: geometry stays in the transformed
 * canvas group, so pinch/pan does not rebuild every rectangle in JS. The
 * matrix also scales the 1 px minimum and corner radius horizontally; that
 * visual cost is deliberately measured rather than hidden.
 */
function MatrixBars({
  bars,
  seriesIds,
  rows,
  xScale,
  yScale,
}: {
  bars: OccupancyLayoutBar[];
  seriesIds: string[];
  rows: number;
  xScale: Scale;
  yScale: Scale;
}) {
  const half = GEOMETRY.barHeight / 2;
  return (
    <Group>
      {bars.map((bar, index) => {
        const x0 = xScale(bar.x0);
        const x1 = xScale(bar.x1);
        const cy = yScale(rows - 0.5 - bar.row);
        return (
          <RoundedRect
            key={index}
            x={x0}
            y={cy - half}
            width={Math.max(x1 - x0, GEOMETRY.barMinWidth)}
            height={GEOMETRY.barHeight}
            r={GEOMETRY.barRadius}
            color={seriesColor(seriesIds[bar.seriesIndex] ?? '')}
          />
        );
      })}
    </Group>
  );
}

export const VictoryTimeline = memo(function VictoryTimeline({
  timeline,
  width,
  height,
  lodEnabled,
  onRenderSignal,
  renderMode,
}: RendererProps & { renderMode: VictoryRenderMode }) {
  const rows = timeline?.days.length ?? 7;
  const layout = useMemo(() => (timeline ? layoutOccupancyTimeline(timeline) : null), [timeline]);
  const labels = useMemo(
    () => (timeline ? timeline.days.map((d) => dayLabel(d, timeline.zone)) : []),
    [timeline],
  );

  const { state: transform } = useChartTransformState();

  // Zoom-aware hour ticks. Victory keeps whatever `tickValues` it is given and
  // only drops the ones outside the zoomed domain, so at 10 % span a fixed
  // every-4-hours list leaves one label. ECharts regenerates ticks per zoom
  // level and hides overlaps itself. Here we do it by hand: from the visible
  // domain (reported by onScaleChange) pick the coarsest hour step whose labels
  // fit the width. This is exactly the adapter code Victory would need in
  // production — part of its cost, so it is in the harness, not hidden.
  // A library layout callback is useful diagnostics, but it is not visible
  // presentation. Run 2 measures the latter externally from native frames.
  const signalStart = useMemo(() => performance.now(), [timeline, lodEnabled, renderMode]);
  const reportedRef = useRef(false);
  useEffect(() => {
    reportedRef.current = false;
  }, [signalStart]);
  const reportRenderSignal = () => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    onRenderSignal?.({ source: 'victory-layout', elapsedMs: performance.now() - signalStart });
  };

  const [visible, setVisible] = useState<[number, number]>([0, 1]);
  const xTicks = useMemo(() => {
    const [d0, d1] = visible;
    const spanHours = Math.max(1, (d1 - d0) * 24);
    const labelPx = 44; // "12 AM" at 12 px, plus breathing room
    const maxLabels = Math.max(2, Math.floor((width - 60) / labelPx));
    const step = [1, 2, 3, 4, 6, 8, 12].find((h) => spanHours / h <= maxLabels) ?? 12;
    return TICKS.filter((t, i) => i % step === 0 && t.position >= d0 - 1e-9 && t.position <= d1 + 1e-9).map(
      (t) => t.position,
    );
  }, [visible, width]);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const boundsRef = useRef({ left: 0, right: width, top: 0, bottom: height });
  const visibleRef = useRef<[number, number]>([0, 1]);

  const displayedLayout = useMemo(
    () =>
      layout && lodEnabled
        ? reduceOccupancyLayout(layout, {
            visibleSpan: visible,
            plotWidthPx: width * PixelRatio.get(),
          })
        : layout,
    [layout, lodEnabled, visible, width],
  );
  const bars = displayedLayout?.bars ?? [];
  const sourceBars = layout?.bars ?? [];
  const seriesIds = displayedLayout?.seriesIds ?? [];

  // Tap → tooltip. Pixel → day fraction through the CURRENT zoom, then row.
  const hitTest = (px: number, py: number) => {
    const b = boundsRef.current;
    const [d0, d1] = visibleRef.current;
    if (px < b.left || px > b.right || py < b.top || py > b.bottom) return;
    const xVal = d0 + ((px - b.left) / (b.right - b.left)) * (d1 - d0);
    const row = Math.floor(((py - b.top) / (b.bottom - b.top)) * rows);
    // Hit-test originals, not reduced geometry, so LOD never changes meaning.
    const hit = sourceBars.find((bar) => bar.row === row && xVal >= bar.x0 && xVal <= bar.x1);
    if (!hit) return;
    const text = occupancyLayoutBarTooltips(hit, timeline!.zone)[0];
    if (text) setTooltip({ text, x: px, y: py });
  };
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .onEnd((e) => {
          'worklet';
          runOnJS(hitTest)(e.x, e.y);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt when bars change; refs otherwise
    [sourceBars, rows, timeline],
  );

  // Zoom limits — enforced after the gesture (see header note 2). Both the
  // scale AND the pan are clamped: for pixel range [L, R] the visible domain is
  // invert((px - tx) / k), so keeping it inside the day means
  // R·(1−k) ≤ tx ≤ L·(1−k). Clamping only k (an earlier version) could leave
  // the view panned past the end of the day with nothing on screen.
  const plotRange = useSharedValue<[number, number]>([0, width]);
  useAnimatedReaction(
    () => ({ active: transform.zoomActive.value || transform.panActive.value, m: transform.matrix.value }),
    ({ active, m }) => {
      if (active) return;
      // Skia's Matrix4 is ROW-major: scaleX at 0, translateX at 3.
      const k = m[0] ?? 1;
      const tx = m[3] ?? 0;
      const maxK = 1 / GEOMETRY.zoomMinSpan;
      const [L, R] = plotRange.value;
      const kc = Math.min(Math.max(k, 1), maxK);
      const txc = Math.min(Math.max(tx, R * (1 - kc)), L * (1 - kc));
      if (kc !== k || txc !== tx) {
        const next = [...m] as unknown as number[];
        next[0] = kc;
        next[3] = txc;
        transform.matrix.value = next as unknown as typeof m;
        transform.offset.value = next as unknown as typeof m;
      }
    },
  );

  useEffect(() => {
    if (!tooltip) return;
    const id = setTimeout(() => setTooltip(null), GEOMETRY.tooltipHideMs);
    return () => clearTimeout(id);
  }, [tooltip]);

  if (!timeline) {
    return (
      <View style={[styles.noData, { width, height: height - 30 }]} onLayout={reportRenderSignal}>
        <Text style={styles.noDataText}>No Data Available</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <GestureDetector gesture={tap}>
      <View style={{ width, height }}>
      <CartesianChart
        data={[{ x: 0, y: 0 }, { x: 1, y: rows }]}
        xKey="x"
        yKeys={['y']}
        domain={{ x: [0, 1], y: [0, rows] }}
        padding={{ left: 8, right: 8, top: 8, bottom: 28 }}
        transformState={transform}
        transformConfig={{ pinch: { dimensions: 'x' }, pan: { dimensions: 'x' } }}
        onChartBoundsChange={(b) => {
          plotRange.value = [b.left, b.right];
          boundsRef.current = b;
          // Victory invokes this callback while CartesianChart is rendering.
          // Reporting synchronously would update App while a child is still
          // rendering, so React can discard the diagnostic. Defer only the
          // parent notification; the timestamp still starts at this mount and
          // the source remains the library's bounds/layout callback.
          requestAnimationFrame(reportRenderSignal);
        }}
        onScaleChange={(x) => {
          // Fires on every render, not only on zoom, and a fresh array each
          // time would loop React forever — so only commit a real change.
          const [a, b] = x.domain() as [number, number];
          const next: [number, number] = [Math.max(0, a), Math.min(1, b)];
          visibleRef.current = next;
          setVisible((prev) =>
            Math.abs(prev[0] - next[0]) < 1e-6 && Math.abs(prev[1] - next[1]) < 1e-6 ? prev : next,
          );
        }}
        xAxis={{
          font,
          tickValues: xTicks,
          // Victory downsamples `tickValues` to `tickCount` (default 5) even
          // when given explicitly; match the count so nothing is dropped.
          tickCount: Math.max(2, xTicks.length),
          formatXLabel: (v) => TICKS[Math.round(Number(v) * 24)]?.label ?? '',
          labelColor: GEOMETRY.axisText,
          lineWidth: 0,
          enableRescaling: true,
        }}
        yAxis={[
          {
            font,
            tickValues: labels.map((_, i) => rows - 0.5 - i),
            tickCount: rows, // otherwise two of the seven day labels are dropped
            formatYLabel: (v) => labels[Math.round(rows - 0.5 - Number(v))] ?? '',
            labelColor: GEOMETRY.axisText,
            lineWidth: 1,
            lineColor: GEOMETRY.rowGuide,
          },
        ]}
        renderOutside={renderMode === 'relayout' ? ({ xScale, yScale, chartBounds }) => (
          <RelayoutBars
            bars={bars}
            seriesIds={seriesIds}
            rows={rows}
            xScale={xScale}
            yScale={yScale}
            bounds={chartBounds}
          />
        ) : undefined}>
        {renderMode === 'matrix'
          ? ({ xScale, yScale }) => (
              <MatrixBars bars={bars} seriesIds={seriesIds} rows={rows} xScale={xScale} yScale={yScale} />
            )
          : () => null}
      </CartesianChart>
      </View>
      </GestureDetector>

      <View style={styles.legend} pointerEvents="none">
        {timeline.series.map((s) => (
          <View key={s.id} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: seriesColor(s.id) }]} />
            <Text style={styles.legendText}>{seriesLabel(s.id)}</Text>
          </View>
        ))}
      </View>

      {tooltip ? (
        <View style={[styles.tooltip, { left: Math.min(tooltip.x, width - 240), top: Math.max(0, tooltip.y - 40) }]} pointerEvents="none">
          <Text style={styles.tooltipText}>{tooltip.text}</Text>
        </View>
      ) : null}
    </View>
  );
});

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
