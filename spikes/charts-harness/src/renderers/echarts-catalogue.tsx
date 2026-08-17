import SkiaChart, { SkiaRenderer } from '@wuba/react-native-echarts/skiaChart';
import { BarChart, GaugeChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { DateTime } from 'luxon';
import { memo, useEffect, useMemo, useRef } from 'react';

import {
  compactFraction,
  mixedCategoryTooltip,
  mixedValueDomain,
  type CatalogueChart,
  type ContinuousObservationChart,
  type MixedObservationChart,
} from '@/charts/chart-catalogue';

import type { CatalogueRendererProps } from '../catalogue-renderer';
import type { RenderSignal } from '../renderer';

echarts.use([
  SkiaRenderer,
  BarChart,
  GaugeChart,
  LineChart,
  ScatterChart,
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
]);

const COLORS = ['#0369A1', '#7DD3FC', '#F59E0B', '#7C3AED'];

function continuousOption(chart: ContinuousObservationChart) {
  return {
    animation: false,
    color: COLORS,
    grid: { left: 52, right: 16, top: 24, bottom: 52 },
    legend: { top: 0, textStyle: { color: '#64748B' } },
    // Native Skia has no DOM, so ECharts' HTML tooltip renderer cannot display.
    tooltip: { trigger: 'axis', confine: true, renderMode: 'richText' },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none', minSpan: 5 }],
    xAxis: {
      type: 'time',
      axisLabel: {
        color: '#64748B',
        formatter: (value: number) => DateTime.fromMillis(value, { zone: chart.zone }).toFormat('h a'),
      },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748B', formatter: (value: number) => `${value} ${chart.unit}` },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: chart.series.map((series, index) => ({
      type: 'line',
      name: series.label,
      showSymbol: false,
      connectNulls: false,
      data: series.points.map((point) => [point.at, point.value]),
      ...(index === 0
        ? {
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: '#DC2626', type: 'dashed' },
              label: {
                formatter: `Threshold ${chart.threshold} ${chart.unit}`,
                position: 'insideEndTop',
              },
              data: [{ yAxis: chart.threshold, name: `Threshold ${chart.threshold} ${chart.unit}` }],
            },
          }
        : {}),
    })),
  };
}

function mixedOption(chart: MixedObservationChart) {
  const valueDomain = mixedValueDomain(chart);
  return {
    animation: false,
    color: COLORS,
    grid: { left: 46, right: 16, top: 24, bottom: 36 },
    legend: { top: 0, textStyle: { color: '#64748B' } },
    tooltip: {
      trigger: 'axis',
      triggerOn: 'click',
      confine: true,
      renderMode: 'richText',
      formatter: (params: { dataIndex?: number } | { dataIndex?: number }[]) => {
        const first = Array.isArray(params) ? params[0] : params;
        const category = chart.categories[first?.dataIndex ?? -1];
        return category ? mixedCategoryTooltip(chart, category) : '';
      },
    },
    xAxis: {
      type: 'category',
      data: chart.categories.map((category) => category.label),
      axisLabel: { color: '#64748B' },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: valueDomain[0],
      max: valueDomain[1],
      axisLabel: { color: '#64748B', formatter: (value: number) => `${value} ${chart.unit}` },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      ...chart.stackOrder.map((key) => ({
        type: 'bar',
        name: key[0]!.toUpperCase() + key.slice(1),
        stack: 'total',
        data: chart.categories.map((category) => category.stacked[key] ?? 0),
      })),
      {
        type: 'line',
        name: 'Target',
        connectNulls: false,
        data: chart.categories.map((category) => category.line),
      },
      {
        type: 'scatter',
        name: 'Events',
        symbolSize: 9,
        data: chart.categories.map((category) => category.marker?.value ?? null),
      },
    ],
  };
}

function compactOption(chart: Extract<CatalogueChart, { kind: 'compact' }>) {
  const fraction = compactFraction(chart);
  if (fraction === null) {
    return {
      animation: false,
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: 'No Data Available', fill: '#64748B', fontSize: 14 },
      }],
      series: [],
    };
  }
  return {
    animation: false,
    series: [{
      type: 'gauge',
      min: chart.min,
      max: chart.max,
      startAngle: 210,
      endAngle: -30,
      progress: { show: true, width: 14, itemStyle: { color: '#0369A1' } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#E2E8F0']] } },
      pointer: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { formatter: `${chart.value} ${chart.unit}`, color: '#0F172A', fontSize: 24 },
      data: [{ value: chart.value }],
    }],
  };
}

function buildOption(chart: CatalogueChart) {
  if (chart.kind === 'continuous') return continuousOption(chart);
  if (chart.kind === 'mixed') return mixedOption(chart);
  return compactOption(chart);
}

export const EChartsCatalogue = memo(function EChartsCatalogue({
  chart,
  width,
  height,
  onRenderSignal,
}: CatalogueRendererProps) {
  const ref = useRef<unknown>(null);
  const option = useMemo(() => buildOption(chart), [chart]);

  useEffect(() => {
    if (!ref.current) return;
    const started = performance.now();
    let reported = false;
    const instance = echarts.init(ref.current as never, 'light', {
      renderer: 'skia' as 'svg',
      width,
      height,
    } as never);
    const report = (source: RenderSignal['source']) => {
      if (reported) return;
      reported = true;
      onRenderSignal?.({ source, elapsedMs: performance.now() - started });
    };
    instance.on('rendered', () => report('echarts-rendered'));
    instance.on('finished', () => report('echarts-finished'));
    instance.setOption(option as never);
    return () => instance.dispose();
  }, [height, onRenderSignal, option, width]);

  return <SkiaChart ref={ref as never} useRNGH />;
});
