import {
  Group,
  matchFont,
  Path as SkiaPath,
  rect,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
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
  batchOccupancyLayoutBars,
  layoutOccupancyTimeline,
  occupancyLayoutBarTooltips,
  type OccupancyLayoutBar,
  windowOccupancyLayout,
} from '@/charts/occupancy-layout';

import type { RendererProps, VictoryRenderMode } from '../renderer';
import { visibleHourTicks } from '../axis-ticks';
import { GEOMETRY, seriesColor, seriesLabel } from '../scenarios';
import {
  clampHorizontalTransform,
  composeScreenSpacePinch,
} from './victory-transform';

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

function ExactBarPaths({
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
  bounds?: { left: number; right: number };
}) {
  const half = GEOMETRY.barHeight / 2;
  // The catalogue's 1 px minimum is a physical pixel. Skia coordinates use
  // React Native layout units, so one logical point would overpaint adjacent
  // ceiling samples on high-density screens and erase their series meaning.
  const minimumWidth = GEOMETRY.barMinWidth / PixelRatio.get();
  const paths = batchOccupancyLayoutBars(bars).map((batch) => {
    const commands: string[] = [];
    for (const bar of batch) {
      const x0 = xScale(bar.x0);
      const x1 = xScale(bar.x1);
      if (bounds && (x1 < bounds.left || x0 > bounds.right)) continue;
      const cy = yScale(rows - 0.5 - bar.row);
      const width = Math.max(x1 - x0, minimumWidth);
      const height = GEOMETRY.barHeight;
      const y = cy - half;
      const radius = Math.min(GEOMETRY.barRadius, width / 2, height / 2);
      const right = x0 + width;
      const bottom = y + height;
      commands.push(
        `M${x0 + radius},${y}H${right - radius}` +
          `Q${right},${y} ${right},${y + radius}` +
          `V${bottom - radius}Q${right},${bottom} ${right - radius},${bottom}` +
          `H${x0 + radius}Q${x0},${bottom} ${x0},${bottom - radius}` +
          `V${y + radius}Q${x0},${y} ${x0 + radius},${y}Z`,
      );
    }
    const first = batch[0]!;
    return {
      key: `${first.seriesIndex}:${first.row}`,
      // One native parse per row/series replaces hundreds of JSI path-builder
      // calls while retaining every exact rectangle, gap and rounded corner.
      path: commands.join(''),
      color: seriesColor(seriesIds[first.seriesIndex] ?? ''),
    };
  });

  return (
    <>
      {paths.map(({ key, path, color }) => (
        <SkiaPath key={key} path={path} color={color} />
      ))}
    </>
  );
}

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

  return (
    <Group clip={clip}>
      <ExactBarPaths
        bars={bars}
        seriesIds={seriesIds}
        rows={rows}
        xScale={zoomed}
        yScale={yScale}
        bounds={bounds}
      />
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
  return (
    <Group>
      <ExactBarPaths bars={bars} seriesIds={seriesIds} rows={rows} xScale={xScale} yScale={yScale} />
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
  const xTicks = useMemo(
    () => visibleHourTicks(TICKS, visible, width).map((tick) => tick.position),
    [visible, width],
  );
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const boundsRef = useRef({ left: 0, right: width, top: 0, bottom: height });
  const visibleRef = useRef<[number, number]>([0, 1]);

  const displayedLayout = useMemo(
    () =>
      layout && lodEnabled
        ? windowOccupancyLayout(layout, visible)
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

  // Victory Native's built-in cumulative pinch composes around an already
  // transformed raw focal coordinate, which makes the second and later
  // pinches drift. Keep Victory's transform state/rendering, but supply the
  // correctly composed screen-space gestures through its public
  // `customGestures` adapter point.
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin((event) => {
          transform.offset.value = transform.matrix.value;
          transform.origin.value = { x: event.focalX, y: event.focalY };
        })
        .onStart(() => {
          transform.zoomActive.value = true;
        })
        .onChange((event) => {
          // Gesture Handler does not guarantee a meaningful focal point in
          // `onBegin` on every platform. Keep the latest active focal for the
          // post-gesture overshoot clamp.
          transform.origin.value = { x: event.focalX, y: event.focalY };
          const offset = transform.offset.value;
          const nextTransform = composeScreenSpacePinch(
            { k: offset[0] ?? 1, tx: offset[3] ?? 0 },
            event.scale,
            event.focalX,
          );
          const next = [...offset] as unknown as number[];
          next[0] = nextTransform.k;
          next[3] = nextTransform.tx;
          transform.matrix.value = next as unknown as typeof offset;
        })
        .onFinalize(() => {
          transform.zoomActive.value = false;
        }),
    [transform],
  );
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onStart(() => {
          transform.panActive.value = true;
        })
        .onChange((event) => {
          const current = transform.matrix.value;
          const next = [...current] as unknown as number[];
          next[3] = (current[3] ?? 0) + event.changeX;
          transform.matrix.value = next as unknown as typeof current;
        })
        .onFinalize(() => {
          transform.panActive.value = false;
        }),
    [transform],
  );
  const chartGestures = useMemo(
    () => Gesture.Race(tap, Gesture.Simultaneous(pinch, pan)),
    [pan, pinch, tap],
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
      const [L, R] = plotRange.value;
      const clamped = clampHorizontalTransform(
        { k, tx },
        L,
        R,
        GEOMETRY.zoomMinSpan,
        transform.origin.value.x,
      );
      const kc = clamped.k;
      const txc = clamped.tx;
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
      <View style={{ width, height }}>
      <CartesianChart
        data={[{ x: 0, y: 0 }, { x: 1, y: rows }]}
        xKey="x"
        yKeys={['y']}
        domain={{ x: [0, 1], y: [0, rows] }}
        padding={{ left: 8, right: 8, top: 8, bottom: 28 }}
        transformState={transform}
        transformConfig={{ pinch: { enabled: false }, pan: { enabled: false } }}
        customGestures={chartGestures}
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
