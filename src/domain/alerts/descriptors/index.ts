/**
 * `resolveDescriptor` — one server alert type + the registry → a complete
 * `AlertTypeDescriptor`.
 *
 * Merge rule (architecture §4.1): registry supplies kind/comparators/icon/
 * window/time-concepts; the SERVER supplies presets and options from
 * `AppMetaData` (`sensitivity_scale`, `duration_scale`, `selectables`) and
 * they win. Unknown slug → GENERIC with `isGeneric: true`.
 *
 * Scale shapes seen in A0 (docs/handovers/Alerts_A0_Ground_Truth.md §1.1):
 *   sensitivity_scale: { "0": {name,value,condition}, …, value_unit?, display_unit? }
 *   duration_scale:    { "0": {name,value,condition}, …, value_unit:'s', display_unit:'m' }
 *   selectables:       { "0": {name,max?,min?,value_type}, "1": {…} }
 * The numeric keys are strings; `value_unit`/`display_unit` sit beside them.
 */

import type {
  AlertTypeDescriptor,
  DescriptorCategory,
  SelectionOption,
  ServerAlertType,
  ThresholdPreset,
  Units,
} from '../types';
import {
  celsiusToFahrenheit,
  deltaCToF,
  displayPresets,
  round1,
} from '../units';
import { GENERIC, REGISTRY, type RegistryEntry } from './registry';

// ------------------------------------------------------------ scales

interface ScaleEntry {
  name?: string;
  value?: number;
}

/** Entries of a scale object in key order "0","1",… ignoring unit keys. */
function scaleEntries(scale: unknown): ScaleEntry[] {
  if (!scale || typeof scale !== 'object') return [];
  const out: [number, ScaleEntry][] = [];
  for (const [key, entry] of Object.entries(scale as Record<string, unknown>)) {
    if (!/^\d+$/.test(key)) continue;
    if (!entry || typeof entry !== 'object') continue;
    out.push([Number(key), entry as ScaleEntry]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(([, e]) => e);
}

/** Server duration scales are stored in seconds and shown in minutes. */
function durationPresetsMinutes(scale: unknown): number[] {
  return scaleEntries(scale)
    .map((e) => (typeof e.value === 'number' ? Math.round(e.value / 60) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function sensitivityPresets(scale: unknown): ThresholdPreset[] {
  return scaleEntries(scale)
    .filter((e) => typeof e.value === 'number')
    .map((e) => ({ label: e.name ?? String(e.value), value: e.value as number }));
}

function selectionOptions(selectables: unknown): SelectionOption[] {
  if (!selectables || typeof selectables !== 'object') return [];
  const out: [number, SelectionOption][] = [];
  for (const [key, entry] of Object.entries(selectables as Record<string, unknown>)) {
    if (!/^\d+$/.test(key) || !entry || typeof entry !== 'object') continue;
    const name = (entry as { name?: string }).name ?? key;
    out.push([Number(key), { label: name, value: Number(key) }]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(([, o]) => o);
}

/** Registry degree bounds are canonical °C; descriptors expose display units. */
function displayRange(
  range: { min: number; max: number } | undefined,
  slug: string,
  units: Units,
): { min: number; max: number } | undefined {
  if (!range || units === 'metric') return range;
  const convert = slug === 'temp-change' ? deltaCToF : celsiusToFahrenheit;
  return { min: round1(convert(range.min)), max: round1(convert(range.max)) };
}

// ------------------------------------------------------------ category

/** Server categories: 1 environmental, 2 behavioural, 3 security, 4 AI insight, 5 other. */
export function categoryFromServer(category: number | undefined | null): DescriptorCategory {
  switch (Number(category)) {
    case 1:
      return 'environmental';
    case 2:
      return 'behavioural';
    case 3:
      return 'presence'; // D7 default: "Presence" for entering/exiting/people-in-stall
    default:
      return 'general';
  }
}

export const CATEGORY_LABEL: Record<DescriptorCategory, string> = {
  behavioural: 'Behaviour',
  environmental: 'Environment',
  presence: 'Presence',
  general: 'General',
};

// ------------------------------------------------------------ resolve

export function resolveDescriptor(alertType: ServerAlertType, units: Units): AlertTypeDescriptor {
  const slug = alertType.slug ?? '';
  const entry: RegistryEntry | undefined = REGISTRY[slug];
  const base = entry ?? GENERIC;
  const meta = (alertType.AppMetaData ?? {}) as Record<string, unknown>;

  const presets = sensitivityPresets(meta.sensitivity_scale);
  const durationScale = durationPresetsMinutes(meta.duration_scale);
  const options = selectionOptions(meta.selectables);

  const threshold: AlertTypeDescriptor['threshold'] = {
    kind: base.threshold.kind,
    unit: base.threshold.unit,
    range: displayRange(base.threshold.range, slug, units),
    allowCustom: base.threshold.allowCustom,
  };
  if (threshold.kind === 'duration') {
    // The duration scale IS the threshold scale for duration types. Minutes
    // are unit-independent — never projected.
    if (durationScale.length) threshold.presets = durationScale.map((m) => ({ label: String(m), value: m }));
  } else if (presets.length) {
    // The server's scale is in STORAGE units; the descriptor contract says
    // presets are in DISPLAY units. Degrees are the only kind that differ.
    threshold.presets = threshold.kind === 'degrees' ? displayPresets(presets, slug, units) : presets;
  }
  if (threshold.kind === 'selection' && options.length) threshold.options = options;

  let triggerDuration = base.triggerDuration;
  if (triggerDuration && threshold.kind !== 'duration' && durationScale.length) {
    // light: the duration scale feeds the trigger presets, not the threshold
    triggerDuration = { ...triggerDuration, presetsMinutes: durationScale };
  }

  return {
    slug: entry ? slug : 'generic',
    id: alertType.id ?? '',
    name: alertType.name,
    // Registry category wins over the server number only for known types;
    // for unknown types the server's category is the best we have.
    category: entry ? base.category : categoryFromServer(alertType.category),
    icon: base.icon,
    threshold,
    triggerDuration,
    queryRange: base.queryRange,
    basedOn: base.basedOn,
    conditions: base.conditions,
    window: base.window,
    isGeneric: !entry,
  };
}

/** Resolve every server type in the user's units; index by id and by slug. */
export function resolveDescriptors(
  types: ServerAlertType[],
  units: Units,
): {
  list: AlertTypeDescriptor[];
  byId: Map<string, AlertTypeDescriptor>;
  bySlug: Map<string, AlertTypeDescriptor>;
} {
  const list = types.map((t) => resolveDescriptor(t, units));
  const byId = new Map<string, AlertTypeDescriptor>();
  const bySlug = new Map<string, AlertTypeDescriptor>();
  for (const d of list) {
    if (d.id) byId.set(d.id, d);
    if (!d.isGeneric) bySlug.set(d.slug, d);
  }
  return { list, byId, bySlug };
}

export { GENERIC, REGISTRY } from './registry';
