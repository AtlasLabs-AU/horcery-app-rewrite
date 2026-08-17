/**
 * `validate(form, descriptor)` → field errors. Pure. Replaces the shipping
 * app's runtime-rebuilt zod schema (D2). Messages are the words shown under
 * the field, so they are written for a person, not a log.
 *
 * Rules (from `alert-form-config.ts` and A0):
 * - a comparator is required where the type offers more than one;
 * - a threshold value is required for degrees / count / number / selection;
 * - a duration is required for duration kinds and where a trigger is required;
 * - "within any" is required where the descriptor says so;
 * - a custom window must have both times, distinct when the type demands
 *   it, and at least the type's minimum length (overnight wraps);
 * - a scope of "selected" with nothing selected is an error.
 */

import type { AlertRuleForm, AlertTypeDescriptor, FieldErrors } from './types';
import { windowMinutes } from './window';

const MAX_MINUTES = 24 * 60;

export function validate(form: AlertRuleForm, descriptor: AlertTypeDescriptor): FieldErrors {
  const errors: FieldErrors = {};
  const kind = descriptor.threshold.kind;

  if (!form.condition && descriptor.conditions.length > 1) {
    errors.condition = 'Choose a condition.';
  }

  switch (kind) {
    case 'degrees':
    case 'count':
    case 'number':
      if (form.thresholdValue == null || !Number.isFinite(form.thresholdValue)) {
        errors.thresholdValue = 'Enter a value.';
      } else if (kind === 'count' && (form.thresholdValue < 0 || !Number.isInteger(form.thresholdValue))) {
        errors.thresholdValue = 'Enter a whole number.';
      }
      break;
    case 'selection':
      if (form.thresholdValue == null) errors.thresholdValue = 'Choose a level.';
      break;
    case 'boolean':
      if (form.booleanValue == null) errors.booleanValue = 'Choose on or off.';
      break;
    case 'duration':
      if (form.durationMinutes == null || form.durationMinutes <= 0) {
        errors.durationMinutes = 'Enter how long.';
      } else if (form.durationMinutes > MAX_MINUTES) {
        errors.durationMinutes = 'Keep it within a day.';
      }
      break;
  }

  if (descriptor.triggerDuration && kind !== 'duration') {
    if (form.durationMinutes != null && (form.durationMinutes < 0 || form.durationMinutes > MAX_MINUTES)) {
      errors.durationMinutes = 'Keep it within a day.';
    }
  }

  if (descriptor.queryRange?.required) {
    if (form.queryRangeMinutes == null || form.queryRangeMinutes <= 0) {
      errors.queryRangeMinutes = 'Enter a value for "within any".';
    }
  }

  if (descriptor.basedOn && form.basedOn == null) {
    errors.basedOn = 'Choose what to base it on.';
  }

  if (form.window.mode === 'custom') {
    const { start, end } = form.window;
    if (!start || !end) {
      errors.window = 'Choose a start and end time.';
    } else {
      const same = start.hour === end.hour && start.minute === end.minute;
      if (descriptor.window.requireDistinct && same) {
        errors.window = 'End time must differ from the start time.';
      } else {
        const length = windowMinutes(form.window);
        if (length < descriptor.window.minMinutes) {
          errors.window = `The window must be at least ${formatMin(descriptor.window.minMinutes)} long.`;
        }
      }
    }
  }

  if (form.scope.apply.mode === 'include' && form.scope.apply.ids.length === 0) {
    errors.scope = form.scope.target === 'stalls' ? 'Choose at least one stall.' : 'Choose at least one horse.';
  } else if (form.scope.notify.mode === 'include' && form.scope.notify.ids.length === 0) {
    errors.scope = 'Choose at least one person.';
  }

  return errors;
}

export function isValid(errors: FieldErrors): boolean {
  return Object.keys(errors).length === 0;
}

function formatMin(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}
