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

// ------------------------------------------------------------ descriptors

export type ThresholdKind =
  | 'duration'
  | 'count'
  | 'degrees'
  | 'luminance'
  | 'decibels'
  | 'percentage'
  | 'number'
  | 'boolean'
  | 'selection';

export interface ThresholdPreset {
  /** Human label, e.g. "Low" / "Medium" / "High" or "30 min". */
  label: string;
  /** Value in DISPLAY units for the given `Units`. */
  value: number;
}

export interface SelectionOption {
  label: string;
  value: number | string;
}

export interface DurationUnitLabel {
  /** Storage/display unit token. */
  unit: 'min' | 'h';
}

/**
 * One alert type, as data. The registry supplies the parts the server does
 * not; `resolveDescriptor` merges the two (server wins for presets/defaults).
 */
export interface AlertTypeDescriptor {
  /** Stable key, e.g. 'lying-down-time'. `generic` when unknown. */
  slug: string;
  /** Server id, present once resolved against an IAlertType. */
  id?: string;
  /** Display name (server's `name`). */
  name: string;
  category: 'behavioural' | 'environmental' | 'general';
  icon: IconName;

  threshold: {
    kind: ThresholdKind;
    /** Unit label per system, e.g. { metric: '°C', imperial: '°F' }. */
    unit?: { metric: string; imperial: string };
    /** Validation bounds in DISPLAY units per system. */
    range?: { metric?: [number, number]; imperial?: [number, number] };
    /** Sensitivity presets in DISPLAY units per system. */
    presets?: { metric: ThresholdPreset[]; imperial: ThresholdPreset[] };
    /** Options when kind === 'selection'. */
    options?: SelectionOption[];
    allowCustom: boolean;
  };

  /** "for more than N" → `trigger_duration`. */
  triggerDuration?: {
    presets?: number[];
    unit: 'min' | 'h';
    allowCustom: boolean;
  };
  /** "within any N" → `query_range_duration`. */
  queryRange?: {
    required: boolean;
    unit: 'min' | 'h';
  };
  /** "based on" → `query_type` (1 single, 2 combined). */
  basedOn?: SelectionOption[];

  /** Comparators that make sense for this type. */
  conditions: AlertCondition[];

  /** Notify-window rules. */
  window: {
    minMinutes: number;
    requireDistinct: boolean;
  };

  /**
   * True when the descriptor was NOT found in the registry and the generic
   * fallback is in use — the UI says so ("showing basic settings").
   */
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
 * What the Configure screen edits. Flat, typed, DISPLAY units. `payload.ts`
 * converts to and from the API's storage shape.
 */
export interface AlertRuleForm {
  alertTypeId: string;
  slug: string;
  condition: AlertCondition | null;
  /** Threshold in display units; null when a preset drives it. */
  thresholdValue: number | null;
  /** Index into descriptor.threshold.presets[units]; null when custom. */
  presetIndex: number | null;
  /** Selection option value when threshold.kind === 'selection'. */
  selectionValue: number | string | null;
  /** Boolean state when threshold.kind === 'boolean'. */
  booleanValue: boolean | null;
  triggerDuration: number | null; // in descriptor.triggerDuration.unit
  triggerCustom: boolean;
  queryRange: number | null; // in descriptor.queryRange.unit
  basedOn: number | string | null;
  window: AlertWindow;
  scope: RuleScope;
}

export type FieldErrors = Partial<
  Record<
    | 'condition'
    | 'thresholdValue'
    | 'selectionValue'
    | 'booleanValue'
    | 'triggerDuration'
    | 'queryRange'
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
