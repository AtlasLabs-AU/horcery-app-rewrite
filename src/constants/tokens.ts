/**
 * Design tokens — the start of the R3 system from the UI design brief
 * (Horcery_App_UI_Design_Requirements.md). Structure adapted from Clarity
 * (https://github.com/SchroederNathan/clarity, MIT); values are Horcery's.
 *
 * Light and dark carry identical key sets. The accent family is seeded from
 * brand #615FFF: tonal indigo for fills and beds, full saturation only for
 * small emphasis (links, active states) — never large floods.
 */

import { Platform } from 'react-native';

export const palette = {
  light: {
    /** Canvas behind everything. */
    background: '#F4F4F6',
    /** Opaque raised card. */
    card: '#FFFFFF',
    /** Soft lavender-tinted bed (grouped-list section, elevated wells). */
    bed: '#EDEDFB',
    /** Tonal indigo control fill (icon circles, switch tracks). */
    fillTonal: '#E4E4F8',
    /** Small-emphasis accent only: links, active checkmarks, tints. */
    accent: '#615FFF',
    /** Text/icon drawn ON an accent fill (selected day, avatar initials). */
    onAccent: '#FFFFFF',
    /** The primary-button surface — near-black in light, flips in dark. */
    inverse: '#1C1C22',
    onInverse: '#FFFFFF',
    /** Ink ramp. */
    foreground: '#1C1C22',
    secondary: '#5B5B66',
    tertiary: '#87878F',
    dimmed: '#B4B4BC',
    /** Lines. */
    divider: '#E6E6EB',
    /** Status. Red is for real alerts and validation only — never data. */
    statusOk: '#12B76A',
    statusAlert: '#E5484D',
  },
  dark: {
    background: '#0B0B0D',
    card: '#1B1B20',
    bed: '#222234',
    fillTonal: '#2C2C48',
    accent: '#7B79FF',
    onAccent: '#FFFFFF',
    inverse: '#F2F2F7',
    onInverse: '#111114',
    foreground: '#F2F2F7',
    secondary: '#A7A7B4',
    tertiary: '#77777F',
    dimmed: '#4E4E56',
    divider: '#2A2A31',
    statusOk: '#30C783',
    statusAlert: '#F2555A',
  },
} as const;

export type TokenColors = Record<keyof typeof palette.light, string>;

/**
 * Type ramp — Apple text-style sizes, same steps on both platforms.
 * Rounded face: iOS system ui-rounded; the Android face is an open decision
 * (R8) — system default stands in until Inakshi picks.
 */
const rounded = Platform.select({ ios: 'ui-rounded', default: undefined });

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', fontFamily: rounded, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '600', fontFamily: rounded, letterSpacing: -0.4 },
  title3: { fontSize: 20, fontWeight: '600', fontFamily: rounded, letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600', fontFamily: rounded, letterSpacing: -0.2 },
  body: { fontSize: 17, fontWeight: '400', fontFamily: rounded },
  subhead: { fontSize: 15, fontWeight: '400', fontFamily: rounded },
  footnote: { fontSize: 13, fontWeight: '400', fontFamily: rounded },
  caption: { fontSize: 12, fontWeight: '400', fontFamily: rounded },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: rounded,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
} as const;

/** 4-pt spacing scale. Screen edge = 16, card padding = 20, app-wide. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  edge: 16,
  card: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Radius steps. Every non-capsule corner pairs with borderCurve 'continuous'. */
export const radius = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  full: 9999,
} as const;

/** Motion durations. Components choose a named pace, never invent milliseconds. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;
