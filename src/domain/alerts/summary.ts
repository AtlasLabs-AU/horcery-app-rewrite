/**
 * The plain-English sentence for a rule — the best UX idea in the shipping
 * app, kept. Shown live while editing and on every Manage Alerts row.
 *
 * Wording follows the shipping templates (`ALERT_SUMMARY_TEMPLATES` in
 * `alert-form-utils.ts`) so customers read the same sentence they know:
 * "You will be notified if your horses lie down for more than 2 h in total
 * between 6:30 AM and 1:00 PM". Times are BARN time (the window's zone).
 *
 * One function per descriptor kind + slug; unknown types get a generic
 * sentence. Localisation (H2) will make these per-locale templates — keep
 * every string in this file.
 */

import { DateTime } from 'luxon';

import { AlertCondition } from '@/config/enums/alert-conditions';

import type { AlertRuleForm, AlertTypeDescriptor, AlertWindow, Units } from './types';
import { isAnyTime } from './window';

const PREFIX = 'You will be notified if';

// ------------------------------------------------------------ pieces

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '';
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

function clock(hour: number, minute: number): string {
  return DateTime.fromObject({ hour, minute }).toFormat('h:mm a');
}

/** " between 6:30 AM and 1:00 PM" or "" for any time. */
export function windowSuffix(window: AlertWindow): string {
  if (isAnyTime(window) || !window.start || !window.end) return '';
  return ` between ${clock(window.start.hour, window.start.minute)} and ${clock(window.end.hour, window.end.minute)}`;
}

function conditionWord(c: AlertCondition | null): string {
  switch (c) {
    case AlertCondition.GREATER_THAN:
      return 'more than';
    case AlertCondition.LESS_THAN:
      return 'less than';
    case AlertCondition.GREATER_THAN_OR_EQUAL_TO:
      return 'at least';
    case AlertCondition.LESS_THAN_OR_EQUAL_TO:
      return 'at most';
    case AlertCondition.NOT_EQUAL_TO:
      return 'not';
    case AlertCondition.EQUAL_TO:
    default:
      return '';
  }
}

function degrees(form: AlertRuleForm, descriptor: AlertTypeDescriptor, units: Units): string {
  const unit = descriptor.threshold.unit ? descriptor.threshold.unit[units] : '';
  const v = form.thresholdValue;
  return v == null ? '…' : `${v} ${unit}`.trim();
}

function withinAny(form: AlertRuleForm): string {
  return form.queryRangeMinutes ? ` within any ${formatMinutes(form.queryRangeMinutes)}` : '';
}

function forDuration(form: AlertRuleForm): string {
  return form.durationMinutes ? ` for ${formatMinutes(form.durationMinutes)}` : '';
}

// ------------------------------------------------------------ sentence

/**
 * The full sentence. Pure; safe to call on every keystroke.
 */
export function ruleSummary(form: AlertRuleForm, descriptor: AlertTypeDescriptor, units: Units): string {
  return `${PREFIX} ${body(form, descriptor, units)}${windowSuffix(form.window)}`;
}

function body(form: AlertRuleForm, descriptor: AlertTypeDescriptor, units: Units): string {
  const cond = conditionWord(form.condition);
  switch (descriptor.slug) {
    case 'temperature':
      return `temperature is ${cond} ${degrees(form, descriptor, units)}`.replace('  ', ' ');
    case 'temp-change': {
      const verb = form.condition === AlertCondition.LESS_THAN ? 'drops' : 'rises';
      return `temperature ${verb} by ${degrees(form, descriptor, units)}${withinAny(form)}`;
    }
    case 'lying-down-count': {
      const n = form.thresholdValue;
      const times = n == null ? '…' : `${n} ${n === 1 ? 'time' : 'times'}`;
      return `your horses lie down ${cond} ${times}${withinAny(form)}`;
    }
    case 'lying-down-time':
      return `your horses lie down for ${cond} ${formatMinutes(form.durationMinutes) || '…'}${basedOnSuffix(form)}`;
    case 'people-in-stall-time': {
      // `== 0` is the "no one" shape (A0 §2.1)
      if (form.condition === AlertCondition.EQUAL_TO && form.thresholdValue === 0) {
        return `no one is in your stall${forDuration(form)}`;
      }
      return `someone is in your stall for ${cond} ${formatMinutes(form.durationMinutes) || '…'}${basedOnSuffix(form)}`;
    }
    case 'people-in-stall':
      return `a person ${form.booleanValue === false ? 'leaves' : 'enters'} your stall${forDuration(form)}`;
    case 'entering-stall':
      return `your horses enter a stall${forDuration(form)}`;
    case 'exiting-stall':
      return `your horses exit a stall${forDuration(form)}`;
    case 'light': {
      const label =
        descriptor.threshold.options?.find((o) => o.value === form.thresholdValue)?.label ?? '…';
      return `light level is ${label}${forDuration(form)}`;
    }
    default: {
      const value = form.thresholdValue ?? form.durationMinutes ?? '…';
      return `${descriptor.name.toLowerCase()} is ${cond} ${value}${forDuration(form)}${withinAny(form)}`.replace('  ', ' ');
    }
  }
}

function basedOnSuffix(form: AlertRuleForm): string {
  return form.basedOn === 2 ? ' in total' : '';
}
