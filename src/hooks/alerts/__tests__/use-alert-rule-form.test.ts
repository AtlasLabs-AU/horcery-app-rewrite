import { act, renderHook } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { AlertCondition } from '@/config/enums/alert-conditions';
import { resolveDescriptors } from '@/domain/alerts/descriptors';
import { emptyForm } from '@/domain/alerts/payload';
import type { ServerAlertType } from '@/domain/alerts/types';
import { formReducer, useAlertRuleForm } from '@/hooks/alerts/use-alert-rule-form';

import typesFixture from '@/domain/alerts/__fixtures__/alert-types.json';

const { bySlug } = resolveDescriptors(typesFixture as unknown as ServerAlertType[], 'metric');
const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-07-15T12:00:00Z');

describe('formReducer', () => {
  const temp = bySlug.get('temperature')!;
  const base = emptyForm(temp, ZONE);

  it('a preset leaves custom mode; typing a threshold enters it', () => {
    const afterPreset = formReducer({ ...base, isCustom: true }, { type: 'preset', value: 20 });
    expect(afterPreset).toMatchObject({ thresholdValue: 20, isCustom: false });
    const afterTyped = formReducer(afterPreset, { type: 'threshold', value: 27.5 });
    expect(afterTyped).toMatchObject({ thresholdValue: 27.5, isCustom: true });
  });

  it('switching to a custom window seeds a working-day window once', () => {
    const custom = formReducer(base, { type: 'windowMode', value: 'custom' });
    expect(custom.window).toMatchObject({ mode: 'custom', start: { hour: 6, minute: 0 }, end: { hour: 18, minute: 0 } });
    const moved = formReducer(custom, { type: 'windowStart', value: { hour: 21, minute: 30 } });
    expect(moved.window.start).toEqual({ hour: 21, minute: 30 });
    // back to any and forth again keeps the user's times
    const any = formReducer(moved, { type: 'windowMode', value: 'any' });
    expect(formReducer(any, { type: 'windowMode', value: 'custom' }).window.start).toEqual({ hour: 21, minute: 30 });
  });

  it('changing the target (horses ↔ stalls) resets a specific apply selection to all', () => {
    const picked = formReducer(base, { type: 'apply', value: { mode: 'include', ids: ['s1'] } });
    expect(picked.scope.apply).toEqual({ mode: 'include', ids: ['s1'] });
    const switched = formReducer(picked, { type: 'target', value: 'horses' });
    expect(switched.scope).toMatchObject({ target: 'horses', apply: { mode: 'all' } });
  });
});

describe('useAlertRuleForm — derived values are pure domain calls', () => {
  it('derives errors, sentence and payload and updates on dispatch', async () => {
    const d = bySlug.get('temp-change')!;
    // RNTL v14: renderHook and act are async.
    const { result } = await renderHook(() =>
      useAlertRuleForm({
        initial: emptyForm(d, ZONE),
        descriptor: d,
        units: 'metric',
        organizationId: 'org-qa',
        now: NOW,
        mode: 'create',
      }),
    );
    expect(result.current.valid).toBe(true);
    expect(result.current.sentence).toContain('temperature rises by 5 °C within any 1 h');
    expect(result.current.payload.condition).toBe(AlertCondition.GREATER_THAN);
    expect(result.current.payload.threshold_value).toBe(5);

    await act(async () => {
      result.current.dispatch({ type: 'condition', value: AlertCondition.LESS_THAN });
      result.current.dispatch({ type: 'preset', value: 10 });
    });
    expect(result.current.sentence).toContain('temperature drops by 10 °C');
    expect(result.current.payload.threshold_value).toBe(-10);

    await act(async () => {
      result.current.dispatch({ type: 'queryRange', value: null });
    });
    expect(result.current.valid).toBe(false);
    expect(result.current.errors.queryRangeMinutes).toBe('Enter a value for "within any".');
  });
});
