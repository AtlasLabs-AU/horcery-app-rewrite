import type { RendererHostProps } from './renderer-host';
import { VictoryTimeline } from './renderers/victory-timeline';

/** Isolated finalist: no ECharts/Wuba module enters Metro's dependency graph. */
export function RendererHost({ victoryMode, ...props }: RendererHostProps) {
  return <VictoryTimeline {...props} renderMode={victoryMode} />;
}
