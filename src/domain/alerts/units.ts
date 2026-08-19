/**
 * Values as the USER sees them.
 *
 * Storage is always metric: the API keeps temperatures in °C, and the alert
 * type's `sensitivity_scale` is expressed in those same storage units. The
 * descriptor contract, however, says `threshold.presets[].value` is in DISPLAY
 * units — the units the form, the sentence and the number field all speak.
 * Projecting once, when the descriptor is resolved, is what makes that
 * contract true; before it existed the raw °C scale was labelled "°F" and then
 * converted a second time on save, so an imperial customer choosing the
 * warmest preset stored a freezing threshold.
 *
 * The imperial temperature scale is NOT a conversion of the metric one. The
 * shipping app anchors on the largest entry, rounded to the nearest 10 °F, and
 * steps down 2 °F per 1 °C (`packages/config/src/utils/alert-form-utils.ts`
 * `formatTemperatureSensitivitySliderLabel`, TEMP_DIFFERENCE_MULTIPLIER = 2).
 * For the [10, 20, 30, 40] °C scale that yields 40 / 60 / 80 / 100 °F — round
 * numbers in each unit system rather than a literal translation of the other,
 * and self-consistent: pick 80 °F, store 26.7 °C, fire at 80 °F. Reproduced
 * exactly (decision, Inakshi 2026-08-18) so that a customer sees the choices
 * they see today and an existing imperial rule lands back on its own preset
 * instead of reading as "Custom".
 *
 * `temp-change` is a DELTA, and the shipping app converts it plainly — the
 * anchored path is `slug === 'temperature'` only (`configure-alert/index.tsx`
 * `isTemperatureImperial`).
 */

import type { ThresholdPreset, Units } from './types';

// ------------------------------------------------------------ conversions

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}
export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}
/** Temperature DELTAS convert without the 32 offset. */
export function deltaCToF(c: number): number {
  return (c * 9) / 5;
}
export function deltaFToC(f: number): number {
  return (f * 5) / 9;
}
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ------------------------------------------------------------ presets

/** The shipping app's rounded °C→°F step for the anchored temperature scale. */
const TEMP_STEP_PER_DEGREE_C = 2;

function preset(value: number): ThresholdPreset {
  return { label: String(value), value };
}

/**
 * The server's scale (storage °C) → the scale this user picks from.
 *
 * Metric passes through untouched: storage IS the display. Only the two
 * `degrees` types convert; counts, durations (minutes) and selection options
 * are unit-independent and must never come through here.
 */
export function displayPresets(
  presets: ThresholdPreset[],
  slug: string,
  units: Units,
): ThresholdPreset[] {
  if (units === 'metric' || presets.length === 0) return presets;

  if (slug === 'temp-change') {
    return presets.map((p) => preset(Math.round(deltaCToF(p.value))));
  }

  if (slug !== 'temperature') {
    // No such type exists today; a plain conversion is the honest default for
    // a future absolute-temperature type the registry gains.
    return presets.map((p) => preset(Math.round(celsiusToFahrenheit(p.value))));
  }

  const ascending = [...presets].sort((a, b) => a.value - b.value);
  const max = ascending[ascending.length - 1].value;
  const anchor = Math.round(celsiusToFahrenheit(max) / 10) * 10;
  return ascending.map((p) => preset(anchor - (max - p.value) * TEMP_STEP_PER_DEGREE_C));
}

/**
 * The preset a form value is sitting on, or null when it is a custom value.
 *
 * Tolerant on purpose. A rule stored at 26.7 °C reads back as 80.06 °F, and
 * the form rounds that to 80.1 — the same preset the customer picked, one
 * rounding step away from it. An exact match would show every imperial preset
 * rule as "Custom". Half a degree is far tighter than the gap between any two
 * presets on any scale the server sends.
 */
export function matchPreset(presets: ThresholdPreset[], value: number | null): number | null {
  if (value == null) return null;
  for (const p of presets) {
    if (Math.abs(p.value - value) < 0.5) return p.value;
  }
  return null;
}
