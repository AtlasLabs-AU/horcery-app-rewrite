/**
 * Alerts domain — shared types.
 *
 * Pure TypeScript. No React, no React Native, no services. Everything in
 * `src/domain/alerts` is exercised by fast unit tests and consumed by hooks
 * and screens; nothing here knows how it is rendered.
 *
 * Design authority: docs/scope/Horcery_Alerts_Architecture.md (v2) §4.
 */

import type { AlertCondition } from '@/config/enums/alert-conditions';
import type { IconName } from '@/components/ui/icon-names';

/** Which measurement system the user prefers; drives display units. */
export type Units = 'metric' | 'imperial';

// ------------------------------------------------------------ server shapes (input)

/**
 * The parts of the API's alert type / alert rule the domain reads. Declared
 * here rather than imported from `src/services` so this layer stays free of
 * service imports (plan §3). Field names are the API's.
 */
export interface ServerAlertType {
  id?: string;
  slug?: string;
  name: string;
  category?: number;
  threshold_type?: number;
  display_unit_singular?: string | null;
  display_unit_plural?: string | null;
  AppMetaData?: unknown;
}

export interface ServerRelation {
  id?: string;
  object_id?: string;
  member_id?: string;
  deleted_at?: string | null;
}

export interface ServerAlertRule {
  id?: string;
  alert_type: string | { id?: string; slug?: string };
  organization_id?: string | null;
  condition?: string | null;
  threshold_value?: number | string | null;
  display_value?: number | null;
  is_custom?: boolean;
  is_custom_duration?: boolean;
  trigger_duration?: string | null;
  query_range_duration?: string | null;
  query_type?: number | string | null;
  evaluation_start_time?: string | null;
  evaluation_end_time?: string | null;
  apply_type?: number | string | null;
  apply_condition?: number | string | null;
  notify_condition?: number | string | null;
  is_push?: boolean;
  is_sms?: boolean;
  is_email?: boolean;
  rule_application_ids?: string[] | null;
  rule_notification_ids?: string[] | null;
  alert_application_rules?: ServerRelation[] | null;
  alert_notification_rules?: ServerRelation[] | null;
  UNATTESTED_META_DATA?: Record<string, unknown> | null;
}

// ------------------------------------------------------------ descriptors

export type ThresholdKind =
  | 'degrees' // temperature, temp-change — °C stored, user's units shown
  | 'count' // lying-down-count
  | 'duration' // lying-down-time, people-in-stall-time — minutes shown; storage shape by `basedOn`
  | 'selection' // light — index into options
  | 'boolean' // entering/exiting/people-in-stall
  | 'number'; // generic fallback

export type DescriptorCategory = 'behavioural' | 'environmental' | 'presence' | 'general';

export interface ThresholdPreset {
  /** Human label, e.g. "30" or "Low". */
  label: string;
  /** Value in DISPLAY units of the form (degrees in the user's units, minutes, count, or option value). */
  value: number;
}

export interface SelectionOption {
  label: string;
  value: number;
}

/**
 * One alert type, as data. The registry supplies what the server does not
 * (kind, comparators, icon, window rules, sentence); `resolveDescriptor`
 * merges the server's `AppMetaData` scales in as presets/options.
 * Ground truth: docs/handovers/Alerts_A0_Ground_Truth.md.
 */
export interface AlertTypeDescriptor {
  slug: string;
  /** Server id, once resolved. */
  id: string;
  /** Server display name. */
  name: string;
  category: DescriptorCategory;
  icon: IconName;

  threshold: {
    kind: ThresholdKind;
    /** Unit label per system for `degrees` (°C / °F). Others are unitless or minutes. */
    unit?: { metric: string; imperial: string };
    /** Inclusive validation bounds in the form's DISPLAY units. */
    range?: { min: number; max: number };
    /** Presets in DISPLAY units. For degrees the SAME numbers apply in either system (A0 §1.1). */
    presets?: ThresholdPreset[];
    /** Options when kind === 'selection'. */
    options?: SelectionOption[];
    allowCustom: boolean;
  };

  /**
   * "for N minutes" → `trigger_duration`, on types whose THRESHOLD is not
   * itself a duration (light, boolean presence). Duration-kind types store
   * their time via `basedOn` instead.
   */
  triggerDuration?: { presetsMinutes?: number[]; allowCustom: boolean };
  /** "within any N" → `query_range_duration`, in minutes. */
  queryRange?: { required: boolean; presetsMinutes: number[] };
  /** "based on" → `query_type`. 1 = single/continuous, 2 = combined/total. */
  basedOn?: SelectionOption[];

  /** Comparators the form offers. Reading is always faithful to what is stored. */
  conditions: AlertCondition[];

  window: { minMinutes: number; requireDistinct: boolean };

  /** True when built from the generic fallback — the UI says so. */
  isGeneric: boolean;
}

// ------------------------------------------------------------ window

export interface ClockTime {
  hour: number; // 0–23
  minute: number; // 0–59
}

/**
 * The evaluation window, in BARN time. `zone` is the organization's IANA
 * timezone; `zoneFallback` is true when the organization had none and the
 * device zone was used instead (the UI must say so).
 */
export interface AlertWindow {
  mode: 'any' | 'custom';
  start?: ClockTime;
  end?: ClockTime;
  zone: string;
  zoneFallback: boolean;
}

/**
 * What we write into `UNATTESTED_META_DATA.window` on save so a later read
 * can detect drift (architecture §7.3).
 */
export interface WindowMetadata {
  zone: string;
  start_local: string; // 'HH:MM'
  end_local: string; // 'HH:MM'
  saved_offset_min: number;
  saved_at: string; // ISO instant
}

export type Drift =
  | { kind: 'offset'; minutes: number }
  | { kind: 'zone'; from: string; to: string };

// ------------------------------------------------------------ scope

export type Selection =
  | { mode: 'all' }
  | { mode: 'include' | 'exclude'; ids: string[] };

export interface RuleScope {
  target: 'horses' | 'stalls';
  apply: Selection;
  notify: Selection;
}

// ------------------------------------------------------------ form

/**
 * What the Configure screen edits — flat, typed, DISPLAY units. It is also
 * what `payload.toForm` produces from an API rule, so it must be able to
 * carry every stored shape faithfully (A0 §2.1), even ones the new form
 * would not author. `payload.toPayload` converts back.
 */
export interface AlertRuleForm {
  alertTypeId: string;
  slug: string;
  condition: AlertCondition | null;
  /** degrees (user's units) · count · selection option value · null when unset. */
  thresholdValue: number | null;
  /** boolean kinds: detected (true) or not (false). */
  booleanValue: boolean | null;
  /** `is_custom` — the user left the preset scale. */
  isCustom: boolean;
  /**
   * Minutes. For duration-kind types this IS the threshold ("for more than
   * 60 min"); for trigger types it is "for N min". Storage shape depends on
   * the descriptor and `basedOn`.
   */
  durationMinutes: number | null;
  /** `is_custom_duration`. */
  isCustomDuration: boolean;
  /** `query_type` — 1 single, 2 combined; null when the type has none. */
  basedOn: number | null;
  /** `query_range_duration` in minutes. */
  queryRangeMinutes: number | null;
  /** `is_push`. Always true for new rules; read faithfully. */
  pushEnabled: boolean;
  window: AlertWindow;
  scope: RuleScope;
}

export type FieldErrors = Partial<
  Record<
    | 'condition'
    | 'thresholdValue'
    | 'booleanValue'
    | 'durationMinutes'
    | 'queryRangeMinutes'
    | 'basedOn'
    | 'window'
    | 'scope',
    string
  >
>;

// ------------------------------------------------------------ permissions

export interface AlertPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}
