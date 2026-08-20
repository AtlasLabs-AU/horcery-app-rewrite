/**
 * The nine alert types the server has (A0, 2026-08-17), as data.
 *
 * Each entry says what the SERVER does not: what kind of thing the threshold
 * is, which comparators the form offers, the icon, the notify-window rules,
 * and which of the three time concepts the type uses. Presets and options
 * come from the server's `AppMetaData` at resolve time (`index.ts`).
 *
 * Nothing here is keyed by string comparison at runtime elsewhere: screens
 * read a resolved `AlertTypeDescriptor` and never look at `slug` themselves.
 *
 * Window minimums are the shipping client's per-type rules
 * (`alert-form-config.ts` ALERT_FORM_NOTIFY_WINDOW_RULES); the server does
 * not send them.
 */

import { AlertCondition } from '@/config/enums/alert-conditions';

import type { AlertTypeDescriptor } from '../types';

/** What the registry supplies; the rest is resolved from the server type. */
export type RegistryEntry = Pick<
  AlertTypeDescriptor,
  'category' | 'icon' | 'conditions' | 'window'
> & {
  threshold: Pick<AlertTypeDescriptor['threshold'], 'kind' | 'unit' | 'range' | 'allowCustom'>;
  triggerDuration?: AlertTypeDescriptor['triggerDuration'];
  queryRange?: AlertTypeDescriptor['queryRange'];
  basedOn?: AlertTypeDescriptor['basedOn'];
};

const HOUR_PRESETS = [60, 120, 180, 360, 720, 1440];

/** "based on" options for the two duration types (A0 §2.1: query_type 1 / 2). */
const DURATION_BASED_ON = [
  { label: 'Continuously', value: 1 },
  { label: 'In total', value: 2 },
];

export const REGISTRY: Record<string, RegistryEntry> = {
  temperature: {
    category: 'environmental',
    icon: 'temperature',
    threshold: {
      kind: 'degrees',
      unit: { metric: '°C', imperial: '°F' },
      // Canonical °C bounds; `resolveDescriptor` projects them to display units.
      range: { min: -10, max: 50 },
      allowCustom: true,
    },
    conditions: [AlertCondition.GREATER_THAN, AlertCondition.LESS_THAN],
    window: { minMinutes: 30, requireDistinct: true },
  },
  'temp-change': {
    category: 'environmental',
    icon: 'temperature',
    threshold: {
      kind: 'degrees',
      unit: { metric: '°C', imperial: '°F' },
      // Canonical °C delta bounds; sign is carried by the comparator.
      range: { min: 2.7, max: 20 },
      allowCustom: true,
    },
    // rise = '>' with a positive threshold; drop = '<' with a NEGATIVE one (A0 §2.1)
    conditions: [AlertCondition.GREATER_THAN, AlertCondition.LESS_THAN],
    queryRange: { required: true, presetsMinutes: HOUR_PRESETS },
    window: { minMinutes: 30, requireDistinct: true },
  },
  light: {
    category: 'environmental',
    icon: 'light',
    threshold: { kind: 'selection', allowCustom: false },
    conditions: [AlertCondition.EQUAL_TO],
    triggerDuration: { allowCustom: true }, // presets from duration_scale
    window: { minMinutes: 30, requireDistinct: true },
  },
  'lying-down-count': {
    category: 'behavioural',
    icon: 'lyingDown',
    threshold: { kind: 'count', range: { min: 0, max: 20 }, allowCustom: true },
    conditions: [AlertCondition.GREATER_THAN],
    queryRange: { required: true, presetsMinutes: HOUR_PRESETS },
    window: { minMinutes: 30, requireDistinct: true },
  },
  'lying-down-time': {
    category: 'behavioural',
    icon: 'lyingDown',
    threshold: { kind: 'duration', allowCustom: true }, // presets from duration_scale
    conditions: [AlertCondition.GREATER_THAN],
    basedOn: DURATION_BASED_ON,
    window: { minMinutes: 120, requireDistinct: true },
  },
  'people-in-stall-time': {
    category: 'presence',
    icon: 'peopleInStall',
    threshold: { kind: 'duration', allowCustom: true },
    conditions: [AlertCondition.GREATER_THAN],
    basedOn: DURATION_BASED_ON,
    window: { minMinutes: 60, requireDistinct: true },
  },
  'people-in-stall': {
    category: 'presence',
    icon: 'peopleInStall',
    threshold: { kind: 'boolean', allowCustom: false },
    conditions: [AlertCondition.GREATER_THAN],
    triggerDuration: { presetsMinutes: [1, 5, 10, 20, 30], allowCustom: true },
    window: { minMinutes: 60, requireDistinct: true },
  },
  'entering-stall': {
    category: 'presence',
    icon: 'entering',
    threshold: { kind: 'boolean', allowCustom: false },
    conditions: [AlertCondition.GREATER_THAN],
    window: { minMinutes: 60, requireDistinct: true },
  },
  'exiting-stall': {
    category: 'presence',
    icon: 'exiting',
    threshold: { kind: 'boolean', allowCustom: false },
    conditions: [AlertCondition.GREATER_THAN],
    window: { minMinutes: 60, requireDistinct: true },
  },
};

/** The fallback for any slug the server sends that the registry does not know. */
export const GENERIC: RegistryEntry = {
  category: 'general',
  icon: 'alerts',
  threshold: { kind: 'number', allowCustom: true },
  conditions: [
    AlertCondition.GREATER_THAN,
    AlertCondition.LESS_THAN,
    AlertCondition.EQUAL_TO,
  ],
  triggerDuration: { allowCustom: true },
  window: { minMinutes: 30, requireDistinct: true },
};
