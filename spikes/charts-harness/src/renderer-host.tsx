import type { RendererProps, RendererId, EChartsProgressiveMode, VictoryRenderMode } from './renderer';
import { EChartsTimeline } from './renderers/echarts-timeline';
import { VictoryTimeline } from './renderers/victory-timeline';

export interface RendererHostProps extends RendererProps {
  rendererId: RendererId;
  progressiveMode: EChartsProgressiveMode;
  victoryMode: VictoryRenderMode;
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
