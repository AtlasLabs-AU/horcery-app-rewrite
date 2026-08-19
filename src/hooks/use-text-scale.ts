import { useWindowDimensions } from 'react-native';

/**
 * How much larger than default the reader has set their text.
 *
 * iOS Dynamic Type and Android font size both land here as `fontScale`: 1 is
 * the default, and the accessibility sizes reach 3.1 on iOS. It moves while the
 * app is open — someone can change it in Control Centre and come straight back
 * — so it is read from `useWindowDimensions`, which re-renders, rather than
 * from `PixelRatio.getFontScale()`, which is a snapshot taken once.
 */

/**
 * Past this, a label and its action can no longer share a line.
 *
 * 1.3 is the scale at which a two-word heading beside a two-word button stops
 * fitting across a phone — measured on the Behavior Tracker card, the tightest
 * header in the app, where the title, "Daily / Weekly" and a ⋮ compete for one
 * row. Below it the side-by-side layout is comfortable and stacking would waste
 * vertical space; above it the title truncates to "Behavior Trac…".
 *
 * One number, in one place, so every row in the app changes its mind at the
 * same moment. Rows deciding this independently is how a page ends up with
 * half its headers stacked and half of them clipped.
 */
export const STACK_ABOVE_SCALE = 1.3;

export interface TextScale {
  /** 1 at the default text size; up to ~3.1 at the largest accessibility size. */
  scale: number;
  /** True once a label and its action no longer fit on one line. */
  stack: boolean;
}

export function useTextScale(): TextScale {
  const { fontScale } = useWindowDimensions();
  return { scale: fontScale, stack: fontScale >= STACK_ABOVE_SCALE };
}
