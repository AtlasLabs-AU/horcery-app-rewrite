import { SkiaChart, SkiaRenderer, SvgChart, SVGRenderer } from '@wuba/react-native-echarts';
import { CustomChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { useEffect, useMemo, useRef } from 'react';

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

function buildOption(timeline: OccupancyTimeline | null, width: number, height: number) {
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
    const data: unknown[] = [];
    days.forEach((day, rowIndex) => {
      for (const bar of s.intervalsByDay[day.key] ?? []) {
        data.push({
          value: [rowIndex, positionInDay(bar.enter, day, zone), positionInDay(bar.exit, day, zone)],
          tooltip: intervalTooltip(bar, zone),
        });
      }
    });
    return {
      type: 'custom',
      name: seriesLabel(s.id),
      z: 2 + seriesIndex,
      clip: true,
      itemStyle: { color: seriesColor(s.id) },
      renderItem: (_params: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[]; style: () => unknown }) => {
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
          style: api.style(),
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
      formatter: (p: { data?: { tooltip?: string } }) => p.data?.tooltip ?? '',
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

export function EChartsTimeline({
  timeline,
  width,
  height,
  onFirstPaint,
  backend,
}: RendererProps & { backend: 'svg' | 'skia' }) {
  const ref = useRef<unknown>(null);
  const option = useMemo(() => buildOption(timeline, width, height), [timeline, width, height]);
  const Chart = backend === 'svg' ? SvgChart : SkiaChart;

  useEffect(() => {
    if (!ref.current) return;
    const t0 = performance.now();
    // Wuba's Skia back-end registers itself under the name 'skia', which is not
    // in ECharts' own RendererType union — hence the cast.
    const chart = echarts.init(ref.current as never, 'light', { renderer: backend as 'svg', width, height });
    chart.setOption(option as never);
    // Wuba's native back-ends do not emit ECharts' `finished`, so "first
    // paint" is the first animation frame after the draw call — the SAME proxy
    // the Victory renderer uses, so the figures are comparable.
    const raf = requestAnimationFrame(() => onFirstPaint?.(performance.now() - t0));
    (chart as unknown as { __raf: number }).__raf = raf;
    return () => {
      cancelAnimationFrame((chart as unknown as { __raf: number }).__raf);
      chart.dispose();
    };
  }, [option, backend, width, height, onFirstPaint]);

  return <Chart ref={ref as never} useRNGH />;
}
