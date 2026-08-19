/**
 * Design tokens — the R3 system from the UI design brief
 * (docs/requirements/Horcery_App_UI_Design_Requirements.md). Structure adapted from Clarity
 * (https://github.com/SchroederNathan/clarity, MIT); values are Horcery's.
 *
 * COLOUR — the "editorial" palette, decided by Inakshi 2026-08-17 after
 * on-device comparison (requirements §4d, PRINCIPLES.md "Colour"):
 *
 * - **White canvas; ink and grey carry the interface.** Text, links,
 *   selected states, icon tints and checkmarks are ink (`accent` IS ink).
 * - **Deep purple lives in exactly one role: control fills** — primary
 *   buttons and the on-state of switches (`inverse`). Nowhere else.
 * - **The two status colours are the only other chroma**, and they are
 *   rationed: `statusAlert` for real alerts and validation, `statusOk` for
 *   confirmed-good — never for data that merely is what it is.
 * - Selection is shown by tone and weight (a light well, headline weight),
 *   never by an inverted block. Depth comes from air and hairlines, not
 *   from tinted containers.
 * - The logo keeps brand #615FFF; that hue does not appear in the UI.
 * - Dark is the twin, not an afterthought: near-black canvas, white ink,
 *   purple lifted so it still reads as purple.
 *
 * Light and dark carry identical key sets. `src/__tests__/no-color-literals`
 * keeps colour out of screens; every hue below is the only place it lives.
 */

import { Platform } from 'react-native';

/**
 * Media colours — the one group that is IDENTICAL in light and dark.
 *
 * A camera frame is a photograph, not a themed surface: it is whatever the
 * barn looks like. So a caption over it cannot take its contrast from the
 * scheme — the scrim below the text is what guarantees legibility, in both
 * schemes and over any frame. Confirmed with the "overlay" tile treatment
 * (Inakshi, 2026-08-17); see `src/components/media/media-tile.tsx`.
 */
const media = {
  /** Caption text on a camera frame. */
  onMedia: '#FFFFFF',
  /** Secondary caption line on a camera frame. */
  onMediaMuted: 'rgba(255,255,255,0.72)',
  /** Bottom stop of the caption scrim. */
  scrim: 'rgba(0,0,0,0.78)',
  /** Top stop of the caption scrim — transparent black, so the ramp is even. */
  scrimClear: 'rgba(0,0,0,0)',
  /** Behind a frame that has not loaded (and under a video's first frame). */
  mediaWell: '#1A1D23',
} as const;

/**
 * Chart colours — the "editorial chart palette" the chart engineering standard
 * (§5) reserved by name and never defined. Decided by Inakshi 2026-08-19.
 *
 * The app chrome is ink and grey because chrome should recede. A chart is the
 * opposite: it is the content, and a farm manager has to spot the odd horse out
 * of five before reading a word. So charts get real colour — two hues, rationed:
 *
 * - **`chartData` (denim)** is every ordinary reading. It appears on every row,
 *   which is precisely why it carries no verdict: it is the colour of "data".
 * - **`chartDeviation` (ochre)** replaces it when a reading falls outside this
 *   horse's own usual range. On a normal morning it never appears — that is what
 *   makes it worth looking at. It is deliberately NOT `statusAlert`: red still
 *   means "we are telling you something is wrong", ochre means "this is not this
 *   horse's normal". See PRINCIPLES.md "Colour": deviation may be coloured,
 *   severity may not.
 * - Everything else — reference lines, the in-stall strip — stays neutral,
 *   because context should not compete with the reading.
 *
 * Denim against ochre is also the one pairing that survives all three kinds of
 * colour blindness; blue/green and red/green both collapse, and red and green
 * are spoken for by `statusAlert`/`statusOk` anyway.
 *
 * Contrast against the canvas, measured: denim 6.08:1 light / 8.66:1 dark;
 * ochre 3.78:1 / 9.36:1; `chartReference` 3.61:1 / 3.68:1 — all clear WCAG
 * 1.4.11's 3:1 for a meaningful graphic. `chartDeviationInk` on
 * `chartDeviationBed` is 7.16:1 / 7.62:1, clearing 4.5:1 for small text; ochre
 * itself is 3.78:1 and so may be a fill but must never be type. `chartBand` and
 * `chartTrack` sit below 3:1 deliberately: each has its value written in words
 * directly beside it, which is 1.4.11's own exemption, and darkening them would
 * make context shout over the reading.
 */
const chartLight = {
  /** Every ordinary reading. Denim. */
  chartData: '#41618C',
  /** A reading outside this horse's usual range. Ochre — never red. */
  chartDeviation: '#B4711E',
  /** Bed behind a deviation badge. */
  chartDeviationBed: '#EFE4D8',
  /** Text on that bed — the darkest shade of the same family, never ochre. */
  chartDeviationInk: '#6B3F0A',
  /** Dashed "usual" line and other reference geometry. */
  chartReference: '#7B8494',
  /** Fill of a usual RANGE, when Data Science supplies one. */
  chartBand: '#E7EAEE',
  /** Observation coverage — the in-stall strip. Context, never the message. */
  chartTrack: '#C9CDD2',
} as const;

const chartDark = {
  chartData: '#8FAFD4',
  chartDeviation: '#E3A853',
  chartDeviationBed: '#3A2A14',
  chartDeviationInk: '#E8B96E',
  chartReference: '#6A6A75',
  chartBand: '#1E2128',
  chartTrack: '#3A3A42',
} as const;

export const palette = {
  light: {
    /** Canvas behind everything. */
    background: '#FAFAFB',
    /** Opaque raised card. */
    card: '#FFFFFF',
    /** Light grey bed (grouped-list section, elevated wells, selected tone). */
    bed: '#F3F3F5',
    /** Grey control fill (switch off-track, tonal wells where still used). */
    fillTonal: '#ECECEF',
    /** Emphasis is INK: links, selected states, icon tints, checkmarks. */
    accent: '#1C1C22',
    /** Text/icon drawn ON an accent fill (selected day, avatar initials). */
    onAccent: '#FFFFFF',
    /** The one place purple lives: primary buttons and switch on-state. */
    inverse: '#3F2E5C',
    onInverse: '#FFFFFF',
    /** Ink ramp. */
    foreground: '#1C1C22',
    secondary: '#5B5B66',
    tertiary: '#87878F',
    dimmed: '#B4B4BC',
    /** Lines. */
    divider: '#E8E8EC',
    /** Status. Red is for real alerts and validation only — never data. */
    statusOk: '#2E9E6B',
    statusAlert: '#D9484A',
    ...chartLight,
    ...media,
  },
  dark: {
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
    ...chartDark,
    ...media,
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
  /**
   * Smallest step (requirements R3.2). Chart axis ticks and nothing else —
   * added 2026-08-19 because the lying-down row had been inventing 9 px and
   * 10.5 px sizes off-ramp, which is the same class of mistake as a colour
   * literal but is not caught by `no-color-literals`.
   */
  micro: { fontSize: 10, fontWeight: '400', fontFamily: rounded },
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
