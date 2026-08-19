import type { RendererHostProps } from './renderer-host';
import { VictoryTimeline } from './renderers/victory-timeline';
import type { CatalogueRendererHostProps } from './catalogue-renderer';
import { VictoryCatalogue } from './renderers/victory-catalogue';

/** Isolated finalist: no ECharts/Wuba module enters Metro's dependency graph. */
export function RendererHost({ victoryMode, ...props }: RendererHostProps) {
  return <VictoryTimeline {...props} renderMode={victoryMode} />;
}

export function CatalogueRendererHost(props: CatalogueRendererHostProps) {
  return <VictoryCatalogue {...props} />;
}
