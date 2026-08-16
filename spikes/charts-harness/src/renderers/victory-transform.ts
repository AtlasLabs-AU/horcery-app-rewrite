export type HorizontalTransform = {
  k: number;
  tx: number;
};

/**
 * Apply a cumulative pinch around a focal point expressed in screen pixels.
 *
 * Victory Native currently right-multiplies the existing transform by a
 * scale around the raw screen-space focal point. That treats the focal point
 * as if it were still in the untransformed chart coordinate system, so later
 * pinches drift. Left composition keeps the data point under the fingers
 * stationary: S(focal) * existing.
 */
export function composeScreenSpacePinch(
  current: HorizontalTransform,
  gestureScale: number,
  focalX: number,
): HorizontalTransform {
  'worklet';
  return {
    k: gestureScale * current.k,
    tx: gestureScale * current.tx + focalX * (1 - gestureScale),
  };
}

/** Clamp zoom and pan so the transformed chart continues to cover the plot. */
export function clampHorizontalTransform(
  current: HorizontalTransform,
  plotLeft: number,
  plotRight: number,
  minimumVisibleSpan: number,
  anchorX = (plotLeft + plotRight) / 2,
): HorizontalTransform {
  'worklet';
  const maxK = 1 / minimumVisibleSpan;
  const k = Math.min(Math.max(current.k, 1), maxK);
  // If scale is reduced after an overshooting pinch, translation must be
  // rebased to the reduced scale. Reusing translation calculated for the raw
  // scale snaps the viewport to a day boundary. Preserve the data coordinate
  // under the last gesture focal point while changing scale.
  const anchorDomain = (anchorX - current.tx) / current.k;
  const rebasedTx = anchorX - k * anchorDomain;
  const tx = Math.min(
    Math.max(rebasedTx, plotRight * (1 - k)),
    plotLeft * (1 - k),
  );
  return { k, tx };
}
