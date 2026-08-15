import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** Hydration never changes after it happens, so nothing ever needs notifying. */
const subscribe = () => () => {};

/**
 * To support static rendering, the colour scheme has to be re-calculated on the
 * client: the server has no way to know it, so it must render the light theme
 * and let the client correct it after hydration.
 *
 * `useSyncExternalStore` is the React-sanctioned way to say "the server and the
 * client disagree about this value". The previous version used
 * `useState(false)` + an effect that immediately set it to `true`, which does
 * work but is a render-then-set-then-render-again round trip, and is exactly
 * the pattern `react-hooks/set-state-in-effect` exists to flag.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true, // client
    () => false, // server / hydration pass
  );

  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : 'light';
}
