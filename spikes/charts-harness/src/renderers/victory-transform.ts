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
): HorizontalTransform {
  'worklet';
  const maxK = 1 / minimumVisibleSpan;
  const k = Math.min(Math.max(current.k, 1), maxK);
  const tx = Math.min(
    Math.max(current.tx, plotRight * (1 - k)),
    plotLeft * (1 - k),
  );
  return { k, tx };
}
