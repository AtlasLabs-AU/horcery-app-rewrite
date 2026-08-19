export type IsolatedRenderer = null | 'echarts-skia' | 'victory';

/** Combined harness default. Metro replaces this module in isolated builds. */
export const ISOLATED_RENDERER: IsolatedRenderer = null;
