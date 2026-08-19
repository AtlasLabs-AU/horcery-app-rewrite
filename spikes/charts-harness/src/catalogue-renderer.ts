import type { CatalogueChart } from '@/charts/chart-catalogue';

import type { RenderSignal, RendererId } from './renderer';

export interface CatalogueRendererProps {
  chart: CatalogueChart;
  width: number;
  height: number;
  onRenderSignal?: (signal: RenderSignal) => void;
}

export interface CatalogueRendererHostProps extends CatalogueRendererProps {
  rendererId: RendererId;
}
