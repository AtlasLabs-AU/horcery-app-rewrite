import type { DateTime } from 'luxon';
import { useCallback, useMemo, useReducer } from 'react';

import type { AlertCondition } from '@/config/enums/alert-conditions';
import { toPayload, type AlertRulePayload } from '@/domain/alerts/payload';
import { ruleSummary } from '@/domain/alerts/summary';
import type {
  AlertRuleForm,
  AlertTypeDescriptor,
  AlertWindow,
  ClockTime,
  FieldErrors,
  RuleScope,
  Selection,
  Units,
} from '@/domain/alerts/types';
import { isValid, validate } from '@/domain/alerts/validate';

/**
 * Form state for Configure — a typed reducer, no form library (D2).
 * Everything derived (errors, sentence, payload) is a pure call into the
 * domain; this hook holds state and nothing else.
 */

export type FormAction =
  | { type: 'condition'; value: AlertCondition | null }
  | { type: 'threshold'; value: number | null }
  | { type: 'preset'; value: number; isCustom?: false }
  | { type: 'custom'; value: boolean }
  | { type: 'boolean'; value: boolean }
  | { type: 'duration'; value: number | null }
  | { type: 'durationCustom'; value: boolean }
  | { type: 'basedOn'; value: number | null }
  | { type: 'queryRange'; value: number | null }
  | { type: 'windowMode'; value: AlertWindow['mode'] }
  | { type: 'windowStart'; value: ClockTime }
  | { type: 'windowEnd'; value: ClockTime }
  | { type: 'target'; value: RuleScope['target'] }
  | { type: 'apply'; value: Selection }
  | { type: 'notify'; value: Selection }
  | { type: 'reset'; value: AlertRuleForm };

export function formReducer(state: AlertRuleForm, action: FormAction): AlertRuleForm {
  switch (action.type) {
    case 'condition':
      return { ...state, condition: action.value };
    case 'threshold':
      return { ...state, thresholdValue: action.value, isCustom: true };
    case 'preset':
      // choosing a preset leaves custom mode
      return { ...state, thresholdValue: action.value, isCustom: false };
    case 'custom':
      return { ...state, isCustom: action.value };
    case 'boolean':
      return { ...state, booleanValue: action.value };
    case 'duration':
      return { ...state, durationMinutes: action.value };
    case 'durationCustom':
      return { ...state, isCustomDuration: action.value };
    case 'basedOn':
      return { ...state, basedOn: action.value };
    case 'queryRange':
      return { ...state, queryRangeMinutes: action.value };
    case 'windowMode': {
      const window: AlertWindow = { ...state.window, mode: action.value };
      if (action.value === 'custom' && (!window.start || !window.end)) {
        // a sensible first custom window: the working day
        window.start = window.start ?? { hour: 6, minute: 0 };
        window.end = window.end ?? { hour: 18, minute: 0 };
      }
      return { ...state, window };
    }
    case 'windowStart':
      return { ...state, window: { ...state.window, mode: 'custom', start: action.value } };
    case 'windowEnd':
      return { ...state, window: { ...state.window, mode: 'custom', end: action.value } };
    case 'target':
      // switching horses ↔ stalls invalidates a specific selection
      return {
        ...state,
        scope: { ...state.scope, target: action.value, apply: { mode: 'all' } },
      };
    case 'apply':
      return { ...state, scope: { ...state.scope, apply: action.value } };
    case 'notify':
      return { ...state, scope: { ...state.scope, notify: action.value } };
    case 'reset':
      return action.value;
    default:
      return state;
  }
}

export interface UseAlertRuleFormOptions {
  initial: AlertRuleForm;
  descriptor: AlertTypeDescriptor;
  units: Units;
  organizationId: string;
  now: DateTime;
  mode: 'create' | 'patch';
  existingMetadata?: Record<string, unknown> | null;
}

export function useAlertRuleForm(opts: UseAlertRuleFormOptions) {
  const [form, dispatch] = useReducer(formReducer, opts.initial);
  const { descriptor, units, organizationId, now, mode, existingMetadata } = opts;

  const errors = useMemo<FieldErrors>(
    () => validate(form, descriptor, units),
    [form, descriptor, units],
  );
  const valid = isValid(errors);
  const sentence = useMemo(() => ruleSummary(form, descriptor, units), [form, descriptor, units]);
  const payload = useMemo<AlertRulePayload>(
    () => toPayload(form, descriptor, { organizationId, units, mode, on: now, existingMetadata }),
    [form, descriptor, organizationId, units, mode, now, existingMetadata],
  );
  const reset = useCallback((next: AlertRuleForm) => dispatch({ type: 'reset', value: next }), []);

  return { form, dispatch, errors, valid, sentence, payload, reset };
}
