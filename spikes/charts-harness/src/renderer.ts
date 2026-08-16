import type { OccupancyTimeline } from '@/charts/occupancy-timeline';

/**
 * The contract every renderer under test implements. Same props, same
 * timeline, same size — the only variable is the library underneath.
 *
 * What a renderer MUST do is PEOPLE_IN_STALL.md §2–§7. In short: seven rows
 * (oldest top), shared hour axis, rounded bars 16 px / r 4 / min 1 px, two
 * series colours, pinch-zoom x only between 10 % and 100 % of the day, pan when
 * zoomed, tap a bar → the exact tooltip text for 2 s, legend, and the no-data
 * overlay when `timeline` is null.
 */
export interface RendererProps {
  timeline: OccupancyTimeline | null;
  width: number;
  height: number;
  lodEnabled: boolean;
  /** Diagnostic library callback. It is NOT proof of visible presentation. */
  onRenderSignal?: (signal: RenderSignal) => void;
}

export interface RenderSignal {
  elapsedMs: number;
  source: 'echarts-rendered' | 'echarts-finished' | 'echarts-raf-fallback' | 'victory-layout';
}

export type EChartsProgressiveMode = 'default' | 'tuned';
export type VictoryRenderMode = 'relayout' | 'matrix';

export type RendererId = 'echarts-svg' | 'echarts-skia' | 'victory-skia';

export const RENDERERS: { id: RendererId; label: string }[] = [
  { id: 'echarts-svg', label: 'ECharts · SVG' },
  { id: 'echarts-skia', label: 'ECharts · Skia' },
  { id: 'victory-skia', label: 'Victory · Skia' },
];
