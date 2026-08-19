import type { RendererHostProps } from './renderer-host';
import { EChartsTimeline } from './renderers/echarts-timeline';
import type { CatalogueRendererHostProps } from './catalogue-renderer';
import { EChartsCatalogue } from './renderers/echarts-catalogue';

/** Isolated finalist: no Victory module enters Metro's dependency graph. */
export function RendererHost({ progressiveMode, ...props }: RendererHostProps) {
  return <EChartsTimeline {...props} backend="skia" progressiveMode={progressiveMode} />;
}

export function CatalogueRendererHost(props: CatalogueRendererHostProps) {
  return <EChartsCatalogue {...props} />;
}
