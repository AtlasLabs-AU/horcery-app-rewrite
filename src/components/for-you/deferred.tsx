import type { ReactNode } from 'react';
import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';

/**
 * Renders `placeholder` until the section is close to the viewport, then swaps
 * in the real `children` and never goes back.
 *
 * This is the fix for the current app's "everything mounts at once" problem:
 * For You is a plain `ScrollView`, so all six widgets — including the charts
 * far below the fold — mount and start fetching the moment the tab opens. Here,
 * a section below the fold costs a reserved box until the user scrolls near it.
 *
 * `reserve` keeps the scrollbar honest before the real content arrives.
 */
export function Deferred({
  children,
  reserve,
  scrollY,
  viewportHeight,
  /** How far below the fold to start mounting, in points. */
  lookahead = 300,
}: {
  children: ReactNode;
  reserve: number;
  scrollY: number;
  viewportHeight: number;
  lookahead?: number;
}) {
  const [top, setTop] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const onLayout = (event: LayoutChangeEvent) => {
    if (top === null) setTop(event.nativeEvent.layout.y);
  };

  if (!mounted && top !== null) {
    const isNear = top < scrollY + viewportHeight + lookahead;
    if (isNear) {
      // setState during render is legal here: it is a state update on this same
      // component, so React re-renders immediately without an extra frame.
      setMounted(true);
    }
  }

  return (
    <View onLayout={onLayout} style={mounted ? undefined : { height: reserve }}>
      {mounted ? children : null}
    </View>
  );
}
