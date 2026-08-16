import SkiaChart, { SkiaRenderer } from '@wuba/react-native-echarts/skiaChart';
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';
import { CustomChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio } from 'react-native';

import {
  dayLabel,
  hourTicks,
  type OccupancyTimeline,
} from '@/charts/occupancy-timeline';
import {
  layoutOccupancyTimeline,
  occupancyLayoutBarTooltips,
  reduceOccupancyLayout,
  type OccupancyLayout,
  type OccupancyLayoutBar,
} from '@/charts/occupancy-layout';

import type { EChartsProgressiveMode, RendererProps, RenderSignal } from '../renderer';
import { GEOMETRY, seriesColor, seriesLabel } from '../scenarios';

/**
 * ECharts (via @wuba/react-native-echarts) — the incumbent, in both of its
 * native back-ends: SVG (react-native-svg, what the current app uses) and Skia.
 *
 * The option is a straight port of the legacy compound-bar-chart generator
 * onto the domain model: a `custom` series drawing one rounded rect per
 * interval on a `value` x-axis 0..1 (position in day) and a category y-axis of
 * seven day labels, inverse so the oldest day is on top. Zoom is ECharts'
 * inside dataZoom with the legacy 10 %–100 % span limits.
 */
echarts.use([
  SVGRenderer,
  SkiaRenderer,
  CustomChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  GraphicComponent,
]);

const TICKS = hourTicks();

interface EChartsBarDatum {
  value: [number, number, number];
  bar: OccupancyLayoutBar;
}

function buildOption(
  timeline: OccupancyTimeline | null,
  layout: OccupancyLayout | null,
  width: number,
  height: number,
  progressiveMode: EChartsProgressiveMode,
) {
  if (!timeline) {
    return {
      xAxis: { show: false, type: 'value', min: 0, max: 1 },
      yAxis: { show: false, type: 'category', data: [] },
      series: [],
      graphic: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          z: 30,
          shape: { width, height: height - 30, r: 12 },
          style: { fill: '#f1f5f9' },
        },
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          z: 31,
          style: { text: 'No Data Available', fill: GEOMETRY.axisText, fontSize: 14 },
        },
      ],
    };
  }

  const { zone, days, series } = timeline;
  const categories = days.map((d) => dayLabel(d, zone));

  const barSeries = series.map((s, seriesIndex) => {
    const data: EChartsBarDatum[] = (layout?.bars ?? [])
      .filter((bar) => bar.seriesIndex === seriesIndex)
      .map((bar) => ({ value: [bar.row, bar.x0, bar.x1], bar }));
    const color = seriesColor(s.id);
    return {
      type: 'custom',
      name: seriesLabel(s.id),
      z: 2 + seriesIndex,
      clip: true,
      itemStyle: { color },
      ...(progressiveMode === 'tuned'
        ? { progressive: 1_000, progressiveThreshold: 1_000, progressiveChunkMode: 'mod' }
        : {}),
      renderItem: (_params: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[] }) => {
        const row = api.value(0);
        const start = api.coord([api.value(1), row]);
        const end = api.coord([api.value(2), row]);
        return {
          type: 'rect',
          shape: {
            x: start[0],
            y: start[1] - GEOMETRY.barHeight / 2,
            width: Math.max(end[0] - start[0], GEOMETRY.barMinWidth),
            height: GEOMETRY.barHeight,
            r: GEOMETRY.barRadius,
          },
          // `api.style()` is deprecated in ECharts 6. The literal is both the
          // current API and the complete style this interval needs.
          style: { fill: color },
        };
      },
      data,
    };
  });

  return {
    animation: false,
    grid: { left: '1%', right: 0, top: '5%', bottom: '15%', containLabel: true },
    color: series.map((s) => seriesColor(s.id)),
    legend: {
      bottom: '1%',
      left: 'center',
      icon: 'circle',
      itemWidth: GEOMETRY.legendSwatch,
      itemHeight: GEOMETRY.legendSwatch,
      textStyle: { color: GEOMETRY.legendText, fontSize: 12 },
      data: series.map((s) => seriesLabel(s.id)),
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'click',
      hideDelay: GEOMETRY.tooltipHideMs,
      confine: true,
      borderWidth: 0,
      backgroundColor: '#ffffff',
      position: (point: [number, number]) => [point[0], point[1] - 40],
      // Formatting stays lazy: the ceiling no longer constructs 6,720 Luxon
      // tooltip strings before a pixel can appear.
      formatter: (p: { data?: EChartsBarDatum }) =>
        p.data?.bar ? occupancyLayoutBarTooltips(p.data.bar, zone).join('\n\n') : '',
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        minSpan: GEOMETRY.zoomMinSpan * 100,
        maxSpan: 100,
      },
    ],
    xAxis: {
      type: 'value',
      min: 0,
      max: 1,
      interval: 1 / 24,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: GEOMETRY.axisText,
        showMinLabel: true,
        showMaxLabel: true,
        hideOverlap: true,
        formatter: (v: number) => TICKS[Math.round(v * 24)]?.label ?? '',
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: GEOMETRY.rowGuide, width: 1 } },
      axisLabel: { color: GEOMETRY.axisText, align: 'right', margin: 20 },
    },
    series: barSeries,
  };
}

export const EChartsTimeline = memo(function EChartsTimeline({
  timeline,
  width,
  height,
  lodEnabled,
  onRenderSignal,
  backend,
  progressiveMode,
}: RendererProps & { backend: 'svg' | 'skia'; progressiveMode: EChartsProgressiveMode }) {
  const ref = useRef<unknown>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);
  const reportedRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);
  const startedRef = useRef(performance.now());
  const initialSizeRef = useRef({ width, height });
  const [visible, setVisible] = useState<readonly [number, number]>([0, 1]);
  const layout = useMemo(() => (timeline ? layoutOccupancyTimeline(timeline) : null), [timeline]);
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
  const option = useMemo(
    () => buildOption(timeline, displayedLayout, width, height, progressiveMode),
    [timeline, displayedLayout, width, height, progressiveMode],
  );
  const Chart = backend === 'svg' ? SvgChart : SkiaChart;

  useEffect(() => {
    if (!ref.current) return;
    startedRef.current = performance.now();
    reportedRef.current = false;
    const report = (source: RenderSignal['source']) => {
      console.log(`[harness] ECharts ${backend} signal=${source}`);
      if (reportedRef.current) return;
      reportedRef.current = true;
      onRenderSignal?.({ source, elapsedMs: performance.now() - startedRef.current });
    };
    // Wuba's Skia back-end registers itself under the name 'skia', which is not
    // in ECharts' own RendererType union — hence the cast.
    const chart = echarts.init(ref.current as never, 'light', {
      renderer: backend as 'svg',
      width: initialSizeRef.current.width,
      height: initialSizeRef.current.height,
      // ECharts normally auto-enables coarse pointers on mobile browsers. The
      // Wuba native adapter has no browser environment, so make the 44 px touch
      // target explicit and verify it on device.
      useCoarsePointer: true,
      pointerSize: 44,
    } as never);
    chartRef.current = chart;
    chart.on('rendered', () => report('echarts-rendered'));
    chart.on('finished', () => report('echarts-finished'));
    chart.on('datazoom', () => {
      const zoom = (chart.getOption() as { dataZoom?: { start?: number; end?: number }[] }).dataZoom?.[0];
      const next: readonly [number, number] = [
        Math.max(0, Math.min(1, (zoom?.start ?? 0) / 100)),
        Math.max(0, Math.min(1, (zoom?.end ?? 100) / 100)),
      ];
      setVisible((previous) =>
        Math.abs(previous[0] - next[0]) < 1e-6 && Math.abs(previous[1] - next[1]) < 1e-6
          ? previous
          : next,
      );
    });
    return () => {
      if (fallbackRef.current !== null) cancelAnimationFrame(fallbackRef.current);
      chartRef.current = null;
      chart.dispose();
    };
  }, [backend, onRenderSignal]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option as never);
    if (!reportedRef.current) {
      fallbackRef.current = requestAnimationFrame(() => {
        if (!reportedRef.current) {
          onRenderSignal?.({
            source: 'echarts-raf-fallback',
            elapsedMs: performance.now() - startedRef.current,
          });
          reportedRef.current = true;
        }
      });
    }
  }, [onRenderSignal, option]);

  useEffect(() => {
    chartRef.current?.resize({ width, height });
  }, [height, width]);

  useEffect(() => setVisible([0, 1]), [timeline]);

  return <Chart ref={ref as never} useRNGH />;
});
