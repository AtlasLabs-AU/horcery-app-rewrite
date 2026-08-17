import { AlertCondition } from '@/config/enums/alert-conditions';

import { resolveDescriptors } from '../descriptors';
import { emptyForm } from '../payload';
import type { AlertRuleForm, ServerAlertType } from '../types';
import { isValid, validate } from '../validate';

import typesFixture from '../__fixtures__/alert-types.json';

const { bySlug } = resolveDescriptors(typesFixture as unknown as ServerAlertType[]);
const ZONE = 'America/Chicago';
const d = (slug: string) => bySlug.get(slug)!;
const form = (slug: string, patch: Partial<AlertRuleForm> = {}): AlertRuleForm => ({
  ...emptyForm(d(slug), ZONE),
  ...patch,
});

describe('validate — the words under the field', () => {
  it('a blank form of every type starts valid (presets fill the values)', () => {
    for (const desc of bySlug.values()) {
      expect(validate(emptyForm(desc, ZONE), desc)).toEqual({});
    }
  });

  it('degrees needs a value', () => {
    expect(validate(form('temperature', { thresholdValue: null }), d('temperature'))).toEqual({
      thresholdValue: 'Enter a value.',
    });
  });

  it('count needs a whole non-negative number', () => {
    expect(validate(form('lying-down-count', { thresholdValue: 2.5 }), d('lying-down-count')).thresholdValue).toBe(
      'Enter a whole number.',
    );
    expect(validate(form('lying-down-count', { thresholdValue: null }), d('lying-down-count')).thresholdValue).toBe(
      'Enter a value.',
    );
  });

  it('"within any" is required where the type says so (temp-change, lying-down-count)', () => {
    expect(validate(form('temp-change', { queryRangeMinutes: null }), d('temp-change')).queryRangeMinutes).toBe(
      'Enter a value for "within any".',
    );
    expect(validate(form('temperature', { queryRangeMinutes: null }), d('temperature')).queryRangeMinutes).toBeUndefined();
  });

  it('duration types need a positive duration within a day', () => {
    expect(validate(form('lying-down-time', { durationMinutes: 0 }), d('lying-down-time')).durationMinutes).toBe(
      'Enter how long.',
    );
    expect(validate(form('lying-down-time', { durationMinutes: 1500 }), d('lying-down-time')).durationMinutes).toBe(
      'Keep it within a day.',
    );
  });

  it('a comparator is required only where the type offers more than one', () => {
    expect(validate(form('temperature', { condition: null }), d('temperature')).condition).toBe('Choose a condition.');
    expect(validate(form('lying-down-count', { condition: null }), d('lying-down-count')).condition).toBeUndefined();
  });

  it('boolean needs on/off; selection needs a level', () => {
    expect(validate(form('entering-stall', { booleanValue: null }), d('entering-stall')).booleanValue).toBe(
      'Choose on or off.',
    );
    expect(validate(form('light', { thresholdValue: null }), d('light')).thresholdValue).toBe('Choose a level.');
  });

  describe('window', () => {
    const custom = (sh: number, sm: number, eh: number, em: number): AlertRuleForm['window'] => ({
      mode: 'custom',
      start: { hour: sh, minute: sm },
      end: { hour: eh, minute: em },
      zone: ZONE,
      zoneFallback: false,
    });

    it('needs both times', () => {
      expect(
        validate(form('temperature', { window: { mode: 'custom', zone: ZONE, zoneFallback: false } }), d('temperature'))
          .window,
      ).toBe('Choose a start and end time.');
    });

    it('rejects identical times when the type requires distinct ones', () => {
      expect(validate(form('temperature', { window: custom(9, 0, 9, 0) }), d('temperature')).window).toBe(
        'End time must differ from the start time.',
      );
    });

    it('enforces the per-type minimum — 30 min for temperature, 2 h for lying-down-time — and wraps overnight', () => {
      expect(validate(form('temperature', { window: custom(9, 0, 9, 20) }), d('temperature')).window).toBe(
        'The window must be at least 30 min long.',
      );
      expect(validate(form('temperature', { window: custom(9, 0, 9, 30) }), d('temperature')).window).toBeUndefined();
      expect(validate(form('lying-down-time', { window: custom(22, 0, 23, 0) }), d('lying-down-time')).window).toBe(
        'The window must be at least 2 h long.',
      );
      // 22:00 → 06:00 wraps to 8 h — fine
      expect(validate(form('lying-down-time', { window: custom(22, 0, 6, 0) }), d('lying-down-time')).window).toBeUndefined();
    });
  });

  it('a "selected" scope with nothing selected is an error, worded for the target', () => {
    expect(
      validate(
        form('temperature', {
          scope: { target: 'horses', apply: { mode: 'include', ids: [] }, notify: { mode: 'all' } },
        }),
        d('temperature'),
      ).scope,
    ).toBe('Choose at least one horse.');
    expect(
      validate(
        form('temperature', {
          scope: { target: 'stalls', apply: { mode: 'all' }, notify: { mode: 'include', ids: [] } },
        }),
        d('temperature'),
      ).scope,
    ).toBe('Choose at least one person.');
  });

  it('isValid', () => {
    expect(isValid({})).toBe(true);
    expect(isValid({ condition: 'x' })).toBe(false);
    // and a fully specified temp-change is valid
    expect(
      isValid(
        validate(
          form('temp-change', { condition: AlertCondition.LESS_THAN, thresholdValue: 10, queryRangeMinutes: 60 }),
          d('temp-change'),
        ),
      ),
    ).toBe(true);
  });
});
