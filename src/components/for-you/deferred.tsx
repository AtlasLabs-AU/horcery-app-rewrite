import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { View } from 'react-native';

interface Viewport {
  scrollY: number;
  viewportHeight: number;
}

interface RevealSource {
  read: () => Viewport;
  subscribe: (listener: () => void) => () => void;
}

const RevealContext = createContext<RevealSource | null>(null);

/**
 * Scroll geometry for `Deferred`, kept out of React state.
 *
 * The obvious implementation — `onScroll` into `useState` on the screen, passed
 * down as props — re-renders the whole For You tree on every scroll event, for
 * the entire session, to serve a decision each section makes exactly once. This
 * publishes the same numbers through a ref plus a subscription, so scrolling
 * costs no renders and each section re-renders once, when it reveals itself.
 *
 * Returns the handlers to spread onto the `ScrollView` and the source to hand
 * to `RevealProvider`.
 */
export function useRevealSource() {
  const viewport = useRef<Viewport>({ scrollY: 0, viewportHeight: 0 });
  const listeners = useRef(new Set<() => void>());

  return useMemo(() => {
    const publish = (next: Partial<Viewport>) => {
      viewport.current = { ...viewport.current, ...next };
      listeners.current.forEach((listener) => listener());
    };

    const source: RevealSource = {
      read: () => viewport.current,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
    };

    return {
      source,
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) =>
        publish({ scrollY: event.nativeEvent.contentOffset.y }),
      onLayout: (event: LayoutChangeEvent) =>
        publish({ viewportHeight: event.nativeEvent.layout.height }),
    };
  }, []);
}

export function RevealProvider({
  source,
  children,
}: {
  source: RevealSource;
  children: ReactNode;
}) {
  return (
    <RevealContext.Provider value={source}>{children}</RevealContext.Provider>
  );
}

/**
 * Renders a reserved box until the section is close to the viewport, then swaps
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
  /** How far below the fold to start mounting, in points. */
  lookahead = 300,
}: {
  children: ReactNode;
  reserve: number;
  lookahead?: number;
}) {
  const source = useContext(RevealContext);
  const [mounted, setMounted] = useState(false);
  const top = useRef<number | null>(null);

  const check = useCallback(() => {
    if (!source || top.current === null) return;
    const { scrollY, viewportHeight } = source.read();
    // Before the ScrollView reports its height there is nothing to compare to.
    if (viewportHeight === 0) return;
    if (top.current < scrollY + viewportHeight + lookahead) setMounted(true);
  }, [source, lookahead]);

  useEffect(() => {
    if (mounted || !source) return;
    check();
    // Dropped as soon as this section mounts: the decision is final.
    return source.subscribe(check);
  }, [mounted, source, check]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (top.current !== null) return;
      top.current = event.nativeEvent.layout.y;
      check();
    },
    [check],
  );

  return (
    <View onLayout={onLayout} style={mounted ? undefined : { height: reserve }}>
      {mounted ? children : null}
    </View>
  );
}
