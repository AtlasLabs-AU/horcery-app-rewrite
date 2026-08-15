import { useColorScheme } from 'react-native';

import { palette, radius, space, type, type TokenColors } from '@/constants/tokens';

/**
 * The R3 theme hook for token-based screens (the design brief's `useTheme`).
 * Named useTokens while the scaffold's Colors-based useTheme still has
 * callers; those migrate here as screens adopt the token system.
 */
export function useTokens(): {
  scheme: 'light' | 'dark';
  colors: TokenColors;
  type: typeof type;
  space: typeof space;
  radius: typeof radius;
} {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme], type, space, radius };
}
