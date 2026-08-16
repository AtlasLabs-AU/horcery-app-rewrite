import { useColorScheme } from 'react-native';

import { themes } from '@/constants/themes';
import { radius, space, type, type TokenColors } from '@/constants/tokens';
import { useThemePreference } from '@acme/stores/theme-preference';

/**
 * The R3 theme hook for token-based screens (the design brief's `useTheme`).
 * Named useTokens while the scaffold's Colors-based useTheme still has
 * callers; those migrate here as screens adopt the token system.
 *
 * On `rnd` the palette comes from the theme variant under review
 * (`useThemePreference`); screens are unaware which one they are drawing.
 */
export function useTokens(): {
  scheme: 'light' | 'dark';
  colors: TokenColors;
  type: typeof type;
  space: typeof space;
  radius: typeof radius;
} {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = useThemePreference((s) => s.theme);
  return { scheme, colors: themes[theme][scheme], type, space, radius };
}
