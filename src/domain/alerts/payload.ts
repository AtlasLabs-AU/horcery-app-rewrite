/**
 * API rule ⇄ form. Every storage rule the server actually uses, in one place,
 * each traceable to a fixture in A0 (docs/handovers/Alerts_A0_Ground_Truth.md §2.1):
 *
 *  - degrees:   stored °C to 1 dp; imperial input keeps the typed °F in
 *               `display_value` (30 °F → threshold −1.1, display_value 30);
 *               metric → `display_value: null`.
 *  - temp-change: direction is the SIGN — rise = '>' +v, drop = '<' −v.
 *  - duration kinds: TWO shapes by `query_type` —
 *               1 (continuous): threshold 1, `trigger_duration` = HH:MM:SS;
 *               2 (in total):   threshold = SECONDS, no trigger.
 *  - selection (light): threshold = option index; trigger from duration scale.
 *  - boolean:   threshold 1, condition '>' as the shipping app writes it;
 *               optional trigger; read faithfully whatever is there.
 *  - `is_custom_duration` is true when the type has no duration scale.
 *  - `query_range_duration` HH:MM:SS from minutes; `query_type` only when
 *               the type has "based on".
 *  - PATCH: an include with zero ids is dropped from the body.
 *  - Never sent: bucket_key, is_call, rule_file_deleted_at, suggested_alert_rule.
 *
 * `toForm` is FAITHFUL: it reproduces any stored shape, including ones the
 * new form would not author, so an old rule survives an edit round-trip.
 */

import type { DateTime } from 'luxon';

import { AlertCondition } from '@/config/enums/alert-conditions';
import type { AlertFilter } from '@/config/enums/alert-filter';

import { scopeFromRule, selectionToApi, targetToApi } from './scope';
import type { AlertRuleForm, AlertTypeDescriptor, AlertWindow, ServerAlertRule, Units } from './types';
import { celsiusToFahrenheit, deltaCToF, deltaFToC, fahrenheitToCelsius, round1 } from './units';
import { buildWindowMetadata, fromStorage, readWindowMetadata, toStorage, windowFromMetadata } from './window';

// ------------------------------------------------------------ HH:MM:SS

export function minutesToHMS(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function hmsToMinutes(hms: string | null | undefined): number | null {
  if (!hms) return null;
  const parts = hms.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  const [h = 0, m = 0, s = 0] = parts;
  return h * 60 + m + s / 60;
}

// ------------------------------------------------------------ read

const COMBINED = 2;

function num(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * API rule → form, in the user's units and the barn's zone.
 * `on` is "now" for the window conversion; `zone`/`zoneFallback` from `resolveZone`.
 */
export function toForm(
  rule: ServerAlertRule,
  descriptor: AlertTypeDescriptor,
  units: Units,
  zone: string,
  on: DateTime,
  zoneFallback = false,
): AlertRuleForm {
  const kind = descriptor.threshold.kind;
  const condition = (rule.condition as AlertCondition | null | undefined) ?? null;
  const stored = num(rule.threshold_value);
  const displayValue = rule.display_value ?? null;
  const basedOn = descriptor.basedOn ? (num(rule.query_type) ?? 1) : null;
  const trigger = hmsToMinutes(rule.trigger_duration);
  const isTempChange = descriptor.slug === 'temp-change';

  let thresholdValue: number | null = null;
  let booleanValue: boolean | null = null;
  let durationMinutes: number | null = null;

  switch (kind) {
    case 'degrees': {
      if (displayValue != null) {
        // imperial input: the typed °F is authoritative
        thresholdValue = isTempChange ? Math.abs(displayValue) : displayValue;
      } else if (stored != null) {
        const c = isTempChange ? Math.abs(stored) : stored;
        thresholdValue =
          units === 'imperial' ? round1(isTempChange ? deltaCToF(c) : celsiusToFahrenheit(c)) : c;
      }
      durationMinutes = trigger;
      break;
    }
    case 'duration': {
      if (basedOn === COMBINED) {
        durationMinutes = stored != null ? stored / 60 : null; // seconds → minutes
      } else {
        durationMinutes = trigger;
        // shape 1 stores threshold 1; anything else (e.g. `== 0`) is kept in thresholdValue
        thresholdValue = stored != null && stored !== 1 ? stored : null;
      }
      break;
    }
    case 'boolean': {
      booleanValue = stored == null ? null : stored >= 1;
      durationMinutes = trigger;
      break;
    }
    case 'selection':
    case 'count':
    case 'number':
    default: {
      thresholdValue = stored;
      durationMinutes = trigger;
      break;
    }
  }

  const meta = readWindowMetadata(rule.UNATTESTED_META_DATA);
  const window: AlertWindow =
    (meta && meta.zone === zone ? windowFromMetadata(meta, zoneFallback) : null) ??
    fromStorage(rule.evaluation_start_time, rule.evaluation_end_time, zone, on, zoneFallback);

  return {
    alertTypeId: typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type?.id ?? descriptor.id),
    slug: descriptor.slug,
    condition,
    thresholdValue,
    booleanValue,
    isCustom: !!rule.is_custom,
    durationMinutes,
    isCustomDuration: !!rule.is_custom_duration,
    basedOn,
    queryRangeMinutes: hmsToMinutes(rule.query_range_duration),
    pushEnabled: rule.is_push ?? true,
    window,
    scope: scopeFromRule(rule),
  };
}

// ------------------------------------------------------------ write

/** The body the app sends. Field names are the API's. */
export interface AlertRulePayload {
  organization_id: string;
  alert_type: string;
  condition: AlertCondition | null;
  threshold_value: number;
  display_value: number | null;
  is_custom: boolean;
  is_custom_duration: boolean;
  trigger_duration: string | null;
  query_range_duration: string | null;
  query_type?: number;
  evaluation_start_time: string;
  evaluation_end_time: string;
  apply_type: number;
  apply_condition?: AlertFilter;
  rule_application_ids?: string[];
  notify_condition?: AlertFilter;
  rule_notification_ids?: string[];
  is_push: boolean;
  is_sms: false;
  is_email: false;
  device_instance_id: null;
  UNATTESTED_META_DATA: Record<string, unknown>;
}

export interface ToPayloadOptions {
  organizationId: string;
  units: Units;
  /** Existing metadata to carry forward (edit). */
  existingMetadata?: Record<string, unknown> | null;
  /** 'create' sends everything; 'patch' drops an include with zero ids. */
  mode: 'create' | 'patch';
  on: DateTime;
}

export function toPayload(
  form: AlertRuleForm,
  descriptor: AlertTypeDescriptor,
  opts: ToPayloadOptions,
): AlertRulePayload {
  const kind = descriptor.threshold.kind;
  const isTempChange = descriptor.slug === 'temp-change';
  const { units } = opts;

  let threshold = 0;
  let displayValue: number | null = null;
  let trigger: string | null = null;
  let condition = form.condition;

  switch (kind) {
    case 'degrees': {
      const typed = form.thresholdValue ?? 0;
      let celsius: number;
      if (units === 'imperial') {
        celsius = round1(isTempChange ? deltaFToC(typed) : fahrenheitToCelsius(typed));
        displayValue = typed;
      } else {
        celsius = typed;
      }
      if (isTempChange) {
        // Direction lives in the SIGN of the stored °C; the form holds a
        // magnitude plus a comparator ('>' rise, '<' drop). display_value,
        // when imperial, keeps the typed magnitude.
        const magnitude = Math.abs(celsius);
        threshold = condition === AlertCondition.LESS_THAN ? -magnitude : magnitude;
        if (displayValue != null) displayValue = Math.abs(displayValue);
      } else {
        threshold = celsius;
      }
      trigger = form.durationMinutes != null ? minutesToHMS(form.durationMinutes) : null;
      break;
    }
    case 'duration': {
      const minutes = form.durationMinutes ?? 0;
      if (form.basedOn === COMBINED) {
        threshold = Math.round(minutes * 60); // seconds, no trigger
        trigger = null;
      } else {
        threshold = form.thresholdValue ?? 1;
        trigger = minutesToHMS(minutes);
      }
      break;
    }
    case 'boolean': {
      threshold = form.booleanValue === false ? 0 : 1;
      condition = condition ?? AlertCondition.GREATER_THAN;
      trigger = form.durationMinutes != null ? minutesToHMS(form.durationMinutes) : null;
      break;
    }
    case 'selection':
    case 'count':
    case 'number':
    default: {
      threshold = form.thresholdValue ?? 0;
      trigger = form.durationMinutes != null ? minutesToHMS(form.durationMinutes) : null;
      break;
    }
  }

  const window = toStorage(form.window, opts.on);
  const apply = selectionToApi(form.scope.apply);
  const notify = selectionToApi(form.scope.notify);

  const payload: AlertRulePayload = {
    organization_id: opts.organizationId,
    alert_type: form.alertTypeId,
    condition,
    threshold_value: threshold,
    display_value: displayValue,
    is_custom: form.isCustom,
    // Written as the form says. The DEFAULT for a new form is `true` when the
    // type has no duration scale (A0 §2.1) — see `emptyForm`.
    is_custom_duration: form.isCustomDuration,
    trigger_duration: trigger,
    query_range_duration: form.queryRangeMinutes != null ? minutesToHMS(form.queryRangeMinutes) : null,
    ...(descriptor.basedOn && form.basedOn != null ? { query_type: form.basedOn } : {}),
    evaluation_start_time: window.start,
    evaluation_end_time: window.end,
    apply_type: targetToApi(form.scope.target),
    apply_condition: apply.condition,
    rule_application_ids: apply.ids,
    notify_condition: notify.condition,
    rule_notification_ids: notify.ids,
    is_push: form.pushEnabled,
    is_sms: false,
    is_email: false,
    device_instance_id: null,
    UNATTESTED_META_DATA: {
      ...(opts.existingMetadata ?? {}),
      window: buildWindowMetadata(form.window, opts.on),
    },
  };

  if (opts.mode === 'patch') {
    // The backend rejects an INCLUDE with no ids; the shipping app drops the pair.
    if (form.scope.apply.mode === 'include' && apply.ids.length === 0) {
      delete payload.apply_condition;
      delete payload.rule_application_ids;
    }
    if (form.scope.notify.mode === 'include' && notify.ids.length === 0) {
      delete payload.notify_condition;
      delete payload.rule_notification_ids;
    }
  }

  return payload;
}

// ------------------------------------------------------------ new form

/**
 * A blank form for creating a rule of this type: first comparator, first
 * preset when there is one, "any time" in the barn zone, apply to all,
 * notify everyone, push on. `isCustomDuration` defaults to true when the type
 * has no duration scale — the shape the shipping app writes (A0 §2.1).
 */
export function emptyForm(
  descriptor: AlertTypeDescriptor,
  zone: string,
  zoneFallback = false,
  target: AlertRuleForm['scope']['target'] = 'stalls',
): AlertRuleForm {
  const kind = descriptor.threshold.kind;
  const firstPreset = descriptor.threshold.presets?.[0]?.value ?? null;
  const hasDurationScale =
    (kind === 'duration' && !!descriptor.threshold.presets?.length) ||
    !!descriptor.triggerDuration?.presetsMinutes?.length;
  return {
    alertTypeId: descriptor.id,
    slug: descriptor.slug,
    condition: descriptor.conditions[0] ?? null,
    thresholdValue: kind === 'degrees' || kind === 'count' || kind === 'number' ? firstPreset : kind === 'selection' ? (descriptor.threshold.options?.[0]?.value ?? null) : null,
    booleanValue: kind === 'boolean' ? true : null,
    isCustom: false,
    durationMinutes:
      kind === 'duration' ? firstPreset : (descriptor.triggerDuration?.presetsMinutes?.[0] ?? null),
    isCustomDuration: !hasDurationScale,
    basedOn: descriptor.basedOn ? descriptor.basedOn[0].value : null,
    queryRangeMinutes: descriptor.queryRange ? descriptor.queryRange.presetsMinutes[0] : null,
    pushEnabled: true,
    window: { mode: 'any', zone, zoneFallback },
    scope: { target, apply: { mode: 'all' }, notify: { mode: 'all' } },
  };
}
