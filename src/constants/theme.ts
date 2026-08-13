/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Horcery brand primary — carried over from the current app's design tokens
 * (gluestack config --color-primary-500 / -600) so the rewrite matches the brand
 * from day one. Each habit of the old palette we adopt gets recorded here.
 */
export const Brand = {
  primary: '#615FFF', // rgb(97 95 255) — primary-500 in the current app
  primaryStrong: '#4F39F6', // primary-600
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Surface palette sampled from the current app's For You page, so the rewrite
 * matches it exactly. The current page is light-only; dark mode is a follow-up,
 * which is why these are literal rather than theme-aware.
 */
export const Fyp = {
  /** Page background behind the cards */
  pageBackground: '#F1F3F7',
  card: '#FFFFFF',
  /** Section titles ("Snapshots", "Review") */
  title: '#252B37',
  /** Header title ("Hello Horcery") */
  headerTitle: '#3F4A5F',
  /** Body and metric text */
  body: '#4B5565',
  /** Muted captions ("Last 2 hours at a glance") */
  muted: '#697586',
  /** Hairline divider inside cards */
  divider: '#E3E8EF',
  /** Neutral pill background (the "10x" chip, segmented track) */
  pill: '#EEF0F5',
  /** Tinted information panel (AI banner, Review empty state) */
  infoBackground: '#EEF0FE',
  infoBorder: '#C7CDFD',
  /** Status dot when everything is healthy */
  statusOk: '#12B76A',
  /** Placeholder surface where a chart will render */
  chartPlaceholder: '#F8F9FB',
} as const;

/** Corner radii used across For You cards. */
export const Radius = {
  card: 12,
  inner: 10,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
