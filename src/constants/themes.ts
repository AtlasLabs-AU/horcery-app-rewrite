import { palette, type TokenColors } from '@/constants/tokens';

/**
 * Theme variants for R&D. `classic` is the current token palette; the others
 * are candidates Inakshi is judging on device (rnd branch, 2026-08-17).
 *
 * Every variant carries the SAME keys as `palette`, so a screen written
 * against `useTokens()` renders in any of them without change — which is the
 * whole point: the switch is a token swap, not a redesign.
 */
export type ThemeName = 'classic' | 'editorial';

export interface Theme {
  name: ThemeName;
  label: string;
  /** One line for the switcher, so the choice is legible without the code. */
  blurb: string;
  light: TokenColors;
  dark: TokenColors;
}

/**
 * EDITORIAL — the direction chosen 2026-08-16/17, tightened after the first
 * on-device look (Inakshi: "keep the background white, more black and grey,
 * very little purple — maybe just on the buttons").
 *
 * So the rule is: **ink and grey carry the interface; purple is a control
 * fill.** Text, links, selected chips, icon tints, checkmarks are all ink
 * (`accent` = ink). The deep purple lives on `inverse` — the surface of
 * primary buttons and the on-state of switches — and nowhere else. The two
 * status colours are the only other chroma. The logo stays #615FFF.
 */
const editorialLight: TokenColors = {
  background: '#FAFAFB',
  card: '#FFFFFF',
  bed: '#F3F3F5',
  fillTonal: '#ECECEF',
  /** Emphasis is INK in this theme — links, selected states, icon tints. */
  accent: '#1C1C22',
  onAccent: '#FFFFFF',
  /** The one place purple lives: primary buttons and switch on-state. */
  inverse: '#3F2E5C',
  onInverse: '#FFFFFF',
  foreground: '#1C1C22',
  secondary: '#5B5B66',
  tertiary: '#87878F',
  dimmed: '#B4B4BC',
  divider: '#E8E8EC',
  statusOk: '#2E9E6B',
  statusAlert: '#D9484A',
};

const editorialDark: TokenColors = {
  background: '#0B0B0D',
  card: '#1A1A1E',
  bed: '#222226',
  fillTonal: '#2C2C31',
  accent: '#F2F2F7',
  onAccent: '#0B0B0D',
  /** Lifted so the button still reads as purple on near-black. */
  inverse: '#7E6BB5',
  onInverse: '#FFFFFF',
  foreground: '#F2F2F7',
  secondary: '#A7A7B4',
  tertiary: '#77777F',
  dimmed: '#4E4E56',
  divider: '#2A2A31',
  statusOk: '#3BC08A',
  statusAlert: '#F0595E',
};

export const themes: Record<ThemeName, Theme> = {
  classic: {
    name: 'classic',
    label: 'Classic',
    blurb: 'Today’s tokens: brand indigo accent on a cool grey canvas.',
    light: palette.light,
    dark: palette.dark,
  },
  editorial: {
    name: 'editorial',
    label: 'Editorial',
    blurb: 'White canvas, ink and grey; deep purple only on buttons and switches.',
    light: editorialLight,
    dark: editorialDark,
  },
};

export const THEME_NAMES = Object.keys(themes) as ThemeName[];
