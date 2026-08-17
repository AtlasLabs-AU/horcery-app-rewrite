import type { RendererProps, RendererId, EChartsProgressiveMode, VictoryRenderMode } from './renderer';
import { EChartsTimeline } from './renderers/echarts-timeline';
import { VictoryTimeline } from './renderers/victory-timeline';
import type { CatalogueRendererHostProps } from './catalogue-renderer';
import { EChartsCatalogue } from './renderers/echarts-catalogue';
import { VictoryCatalogue } from './renderers/victory-catalogue';

export interface RendererHostProps extends RendererProps {
  rendererId: RendererId;
  progressiveMode: EChartsProgressiveMode;
  victoryMode: VictoryRenderMode;
}

export function CatalogueRendererHost({ rendererId, ...props }: CatalogueRendererHostProps) {
  return rendererId === 'victory-skia'
    ? <VictoryCatalogue {...props} />
    : <EChartsCatalogue {...props} />;
}

/** Combined R&D harness. Metro replaces this module in isolated builds. */
export function RendererHost({ rendererId, progressiveMode, victoryMode, ...props }: RendererHostProps) {
  switch (rendererId) {
    case 'echarts-svg':
      return <EChartsTimeline {...props} backend="svg" progressiveMode={progressiveMode} />;
    case 'echarts-skia':
      return <EChartsTimeline {...props} backend="skia" progressiveMode={progressiveMode} />;
    case 'victory-skia':
      return <VictoryTimeline {...props} renderMode={victoryMode} />;
  }
}
