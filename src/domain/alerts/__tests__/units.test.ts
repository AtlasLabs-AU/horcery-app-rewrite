import { AlertCondition } from '@/config/enums/alert-conditions';
import { DateTime } from 'luxon';

import { resolveDescriptor } from '../descriptors';
import { emptyForm, toForm, toPayload } from '../payload';
import type { ServerAlertRule, ServerAlertType, Units } from '../types';
import { displayPresets, matchPreset } from '../units';

import typesFixture from '../__fixtures__/alert-types.json';

/**
 * Imperial threshold presets.
 *
 * The bug this pins: the server's `sensitivity_scale` is in STORAGE units
 * (°C), and it used to be labelled with the user's unit and then converted a
 * SECOND time on save. An imperial customer picking the warmest temperature
 * preset — shown as "40 °F" — stored 4.4 °C, so a heat alert fired on cold.
 *
 * The numbers below are the shipping app's, not a conversion: see
 * `domain/alerts/units.ts` for why, and `alert-form-utils.ts`
 * (`formatTemperatureSensitivitySliderLabel`) for the original.
 */

const ZONE = 'America/Chicago';
const ON = DateTime.fromISO('2026-08-18T12:00:00', { zone: ZONE });
const TYPES = typesFixture as unknown as ServerAlertType[];

function type(slug: string): ServerAlertType {
  const found = TYPES.find((t) => t.slug === slug);
  if (!found) throw new Error(`fixture has no ${slug}`);
  return found;
}

function presetValues(slug: string, units: Units): number[] {
  return resolveDescriptor(type(slug), units).threshold.presets?.map((p) => p.value) ?? [];
}

describe('the server scale is in storage units', () => {
  it('temperature ships [10,20,30,40] °C with value_unit C — the raw scale the bug mislabelled', () => {
    const scale = (type('temperature').AppMetaData as Record<string, Record<string, { value: number }>>)
      .sensitivity_scale;
    expect([scale['0'].value, scale['1'].value, scale['2'].value, scale['3'].value]).toEqual([10, 20, 30, 40]);
  });
});

describe('displayPresets', () => {
  it('metric passes through untouched — storage IS the display', () => {
    expect(presetValues('temperature', 'metric')).toEqual([10, 20, 30, 40]);
    expect(presetValues('temp-change', 'metric')).toEqual([5, 10, 15, 20]);
  });

  it('imperial temperature is the shipping app’s anchored scale, NOT a conversion', () => {
    // A true conversion would be 50/68/86/104. The shipping app anchors on the
    // largest entry rounded to 10 °F and steps 2 °F per °C.
    expect(presetValues('temperature', 'imperial')).toEqual([40, 60, 80, 100]);
  });

  it('imperial temp-change is a plain delta conversion (no 32 offset)', () => {
    expect(presetValues('temp-change', 'imperial')).toEqual([9, 18, 27, 36]);
  });

  it('labels match the values, so a chip never says one number and means another', () => {
    const d = resolveDescriptor(type('temperature'), 'imperial');
    expect(d.threshold.presets?.map((p) => p.label)).toEqual(['40', '60', '80', '100']);
  });

  it('leaves unit-independent kinds alone in imperial', () => {
    // counts, durations (minutes) and selection options are not measurements
    expect(presetValues('lying-down-count', 'imperial')).toEqual(presetValues('lying-down-count', 'metric'));
    expect(presetValues('lying-down-time', 'imperial')).toEqual(presetValues('lying-down-time', 'metric'));
    expect(
      resolveDescriptor(type('light'), 'imperial').threshold.options,
    ).toEqual(resolveDescriptor(type('light'), 'metric').threshold.options);
  });

  it('is safe on an empty or absent scale', () => {
    expect(displayPresets([], 'temperature', 'imperial')).toEqual([]);
  });
});

describe('what actually gets stored', () => {
  function storedFor(slug: string, units: Units, presetValue: number): number {
    const d = resolveDescriptor(type(slug), units);
    const form = { ...emptyForm(d, ZONE), thresholdValue: presetValue };
    return toPayload(form, d, { organizationId: 'org', units, mode: 'create', on: ON }).threshold_value;
  }

  it('imperial temperature presets store the shipping app’s °C', () => {
    // fahrenheitToCelsius(label).toFixed(1) in the shipping app
    expect(storedFor('temperature', 'imperial', 40)).toBe(4.4);
    expect(storedFor('temperature', 'imperial', 60)).toBe(15.6);
    expect(storedFor('temperature', 'imperial', 80)).toBe(26.7);
    expect(storedFor('temperature', 'imperial', 100)).toBe(37.8);
  });

  it('imperial temp-change presets round-trip back to the server’s own °C', () => {
    expect(storedFor('temp-change', 'imperial', 9)).toBe(5);
    expect(storedFor('temp-change', 'imperial', 18)).toBe(10);
    expect(storedFor('temp-change', 'imperial', 27)).toBe(15);
    expect(storedFor('temp-change', 'imperial', 36)).toBe(20);
  });

  it('metric presets store exactly what the server sent', () => {
    expect(storedFor('temperature', 'metric', 30)).toBe(30);
    expect(storedFor('temp-change', 'metric', 10)).toBe(10);
  });

  it('REGRESSION: the warmest imperial preset is a heat threshold, not a freezing one', () => {
    // Taken from the descriptor, NOT hard-coded — that is what makes this bite.
    // Before the fix the warmest preset was "40 °F" and stored 4.4 °C: a heat
    // alert that fired on cold.
    const presets = resolveDescriptor(type('temperature'), 'imperial').threshold.presets ?? [];
    const warmest = presets[presets.length - 1].value;
    expect(storedFor('temperature', 'imperial', warmest)).toBeGreaterThan(30);
  });
});

describe('a new imperial rule starts on a real preset', () => {
  it('seeds the first DISPLAY preset, not the raw °C', () => {
    const d = resolveDescriptor(type('temperature'), 'imperial');
    expect(emptyForm(d, ZONE).thresholdValue).toBe(40);
  });
});

describe('matchPreset', () => {
  const presets = [
    { label: '40', value: 40 },
    { label: '60', value: 60 },
    { label: '80', value: 80 },
    { label: '100', value: 100 },
  ];

  it('matches a stored value that reads back one rounding step away', () => {
    // 26.7 °C → 80.06 °F → the form rounds to 80.1
    expect(matchPreset(presets, 80.1)).toBe(80);
  });

  it('leaves a genuinely custom value as custom', () => {
    expect(matchPreset(presets, 72)).toBeNull();
    expect(matchPreset(presets, null)).toBeNull();
  });
});

describe('an existing imperial rule reopens on its own preset', () => {
  it('a rule stored at 26.7 °C lands on 80 °F rather than reading as Custom', () => {
    const d = resolveDescriptor(type('temperature'), 'imperial');
    const rule = {
      id: 'r1',
      alert_type: d.id,
      condition: AlertCondition.GREATER_THAN,
      threshold_value: 26.7,
      display_value: null,
      evaluation_start_time: '00:00:00',
      evaluation_end_time: '23:59:59',
      UNATTESTED_META_DATA: {},
    } as unknown as ServerAlertRule;

    const form = toForm(rule, d, 'imperial', ZONE, ON);
    expect(matchPreset(d.threshold.presets ?? [], form.thresholdValue)).toBe(80);
  });

  it('a rule authored as a custom 30 °F still reads as custom', () => {
    const d = resolveDescriptor(type('temperature'), 'imperial');
    const rule = {
      id: 'r2',
      alert_type: d.id,
      condition: AlertCondition.GREATER_THAN,
      threshold_value: -1.1,
      display_value: 30,
      evaluation_start_time: '00:00:00',
      evaluation_end_time: '23:59:59',
      UNATTESTED_META_DATA: {},
    } as unknown as ServerAlertRule;

    const form = toForm(rule, d, 'imperial', ZONE, ON);
    expect(form.thresholdValue).toBe(30);
    expect(matchPreset(d.threshold.presets ?? [], form.thresholdValue)).toBeNull();
  });
});
