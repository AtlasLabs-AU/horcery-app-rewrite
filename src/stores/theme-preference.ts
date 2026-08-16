import { create } from 'zustand';

import { THEME_NAMES, type ThemeName } from '@/constants/themes';

/**
 * Which theme variant `useTokens` serves. R&D scaffolding: the switcher lives
 * on the Protos tab and never leaves `rnd`. Once Inakshi picks, the winner
 * becomes `palette` in tokens.ts and this store goes away.
 *
 * In memory on purpose — persisting it would drag AsyncStorage into every
 * component test that reads a token. To start a review session on a variant,
 * set `EXPO_PUBLIC_RND_THEME=editorial` when starting Metro.
 */
interface ThemePreference {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const envTheme = process.env.EXPO_PUBLIC_RND_THEME;
const initial: ThemeName = THEME_NAMES.includes(envTheme as ThemeName)
  ? (envTheme as ThemeName)
  : 'classic';

export const useThemePreference = create<ThemePreference>()((set) => ({
  theme: initial,
  setTheme: (theme) => set({ theme }),
}));
