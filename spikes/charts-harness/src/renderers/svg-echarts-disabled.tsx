import type { ComponentProps } from 'react';

/** Metro substitutes this in the isolated ECharts-Skia build. */
export const SVGRenderer = { install() {} };

export default function SvgChartDisabled(_props: ComponentProps<'div'>): never {
  throw new Error('The SVG backend is excluded from this ECharts-Skia finalist build.');
}
