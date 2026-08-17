import { BlurView } from 'expo-blur';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { motion } from '@/constants/tokens';

/**
 * Soft enough to read the layout through, strong enough to say "behind".
 *
 * The tint matters more than the number: the `thick` materials add a heavy
 * grey veil on top of the blur, which flattened the whole screen to a wash.
 * `thin` keeps the app's own colour and lets the blur do the work.
 */
const BLUR_INTENSITY = 45;

interface SheetBackdrop {
  /** Called when a sheet opens; balanced by `release`. */
  present: () => void;
  release: () => void;
}

const SheetBackdropContext = createContext<SheetBackdrop | null>(null);

/**
 * Softly blurs the app while a sheet is open.
 *
 * **This replaced a scale-back** (the app shrinking to 0.93 behind the sheet,
 * copied from the MotionFlix transition). Inakshi rejected it on device —
 * "I don't want the app to shrink, it looks bad" — and she is right about
 * why: shrinking the app makes the sheet look *wider than the screen*, which
 * reads as a mistake rather than as depth, and it needs a black surround to
 * work at all. A blur keeps every element exactly where it was and still says
 * "this is behind now", which is what staying in context means.
 *
 * The native sheet from `@expo/ui/community/bottom-sheet` owns the drag, the
 * snap and the dismiss. This is the only thing we animate ourselves, and it
 * is deliberately the part with no gesture in it — one fade on one overlay.
 *
 * Counted rather than boolean: closing one sheet must not un-blur the app
 * while another is still open.
 */
export function SheetBackdropHost({ children }: { children: ReactNode }) {
  const { scheme } = useTokens();
  const [depth, setDepth] = useState(0);
  // useState, not useRef().current: reading a ref during render is what the
  // React Compiler forbids, and the lazy initialiser gives the same "created
  // once" guarantee.
  const [progress] = useState(() => new Animated.Value(0));

  const present = useCallback(() => setDepth((count) => count + 1), []);
  const release = useCallback(() => setDepth((count) => Math.max(0, count - 1)), []);
  const value = useMemo(() => ({ present, release }), [present, release]);

  const open = depth > 0;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: motion.base,
      // Opacity only, so the whole fade runs on the native driver.
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [open, progress]);

  return (
    <SheetBackdropContext.Provider value={value}>
      <View style={styles.host}>
        {children}
        {/*
          Mounted only while a sheet is up: a full-screen blur is one of the
          more expensive things a phone can draw, and leaving it mounted at
          zero opacity still costs a composite every frame (PRINCIPLES #2).
        */}
        {open || depth > 0 ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: progress }]}
            pointerEvents="none">
            <BlurView
              intensity={BLUR_INTENSITY}
              tint={scheme === 'dark' ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
      </View>
    </SheetBackdropContext.Provider>
  );
}

/**
 * No-ops when there is no host — a component test renders a Menu without the
 * root layout, and a sheet that cannot blur the app is still a working sheet.
 */
export function useSheetBackdrop(): SheetBackdrop {
  const context = useContext(SheetBackdropContext);
  return context ?? NOOP;
}

const NOOP: SheetBackdrop = { present: () => {}, release: () => {} };

const styles = StyleSheet.create({
  host: { flex: 1 },
});
