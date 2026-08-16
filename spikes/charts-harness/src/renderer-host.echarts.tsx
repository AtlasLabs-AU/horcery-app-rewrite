import type { RendererHostProps } from './renderer-host';
import { EChartsTimeline } from './renderers/echarts-timeline';

/** Isolated finalist: no Victory module enters Metro's dependency graph. */
export function RendererHost({ progressiveMode, ...props }: RendererHostProps) {
  return <EChartsTimeline {...props} backend="skia" progressiveMode={progressiveMode} />;
}
