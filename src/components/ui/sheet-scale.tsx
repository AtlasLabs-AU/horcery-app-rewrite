import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet } from 'react-native';

import { radius } from '@/constants/tokens';

/**
 * How far the app shrinks behind an open sheet. MotionFlix's own value
 * (`createSheetTransition`, page scaled to 0.93) — far enough to read as a
 * layer behind glass, near enough that nothing appears to jump.
 */
const SCALE = 0.93;

interface SheetScale {
  /** Called when a sheet opens; balanced by `release`. */
  present: () => void;
  release: () => void;
}

const SheetScaleContext = createContext<SheetScale | null>(null);

/**
 * Scales the whole app back while a sheet is open.
 *
 * The native sheet from `@expo/ui/community/bottom-sheet` brings the drag,
 * the snap and the dismiss — everything that has to feel right under a
 * finger, and everything we would otherwise be hand-writing. What it does
 * not do is move the app behind it, and that recession is the part of the
 * MotionFlix transition Inakshi picked (2026-08-17).
 *
 * So this is the only hand-animated piece, and it is deliberately the piece
 * with no gesture in it: a spring on one container, driven by a boolean.
 * It wraps the root navigator, so the tab bar recedes with the screen rather
 * than the screen shrinking inside a stationary frame.
 *
 * **React Native's `Animated`, not Reanimated**, for two reasons: the whole
 * animation is one native-driven transform, which is precisely what the old
 * API is good at; and Reanimated cannot be imported under jest without its
 * native module (its own mock re-imports the real entry point), which would
 * fail every suite that renders a `Menu`.
 *
 * The corner radius is constant rather than animated: at rest the container
 * fills the screen, where the device's own much larger corner mask hides it,
 * and it only becomes visible once the view has scaled inward — which is the
 * moment it is wanted. That keeps the transform on the native driver, which
 * a `borderRadius` animation would not allow.
 *
 * Counted rather than boolean: closing one sheet must not un-scale the app
 * while another is still open.
 */
export function SheetScaleHost({ children }: { children: ReactNode }) {
  const [depth, setDepth] = useState(0);
  // useState, not useRef().current: reading a ref during render is what the
  // React Compiler forbids, and the lazy initialiser gives the same "created
  // once" guarantee.
  const [progress] = useState(() => new Animated.Value(0));

  const present = useCallback(() => setDepth((count) => count + 1), []);
  const release = useCallback(() => setDepth((count) => Math.max(0, count - 1)), []);
  const value = useMemo(() => ({ present, release }), [present, release]);

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: depth > 0 ? 1 : 0,
      damping: 24,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [depth, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, SCALE] });

  return (
    <SheetScaleContext.Provider value={value}>
      <Animated.View style={[styles.host, { transform: [{ scale }] }]}>{children}</Animated.View>
    </SheetScaleContext.Provider>
  );
}

/**
 * No-ops when there is no host — a component test renders a Menu without the
 * root layout, and a sheet that cannot scale the app is still a working sheet.
 */
export function useSheetScale(): SheetScale {
  const context = useContext(SheetScaleContext);
  return context ?? NOOP;
}

const NOOP: SheetScale = { present: () => {}, release: () => {} };

const styles = StyleSheet.create({
  host: {
    flex: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
