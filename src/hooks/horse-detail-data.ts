import { DateTime } from 'luxon';

import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';

/**
 * Pure builders for the horse's own facts, kept outside the hook so their
 * behaviour is cheap to characterize (the same split as `horses-data.ts`).
 */

/** A row of the passport. `value` is already formatted and never empty. */
export interface PassportField {
  id: string;
  label: string;
  value: string;
}

/**
 * Shown when a fact is genuinely absent, rather than leaving a blank line.
 * The current app prints "N/A"; this says the same thing in words a person
 * would use.
 */
const UNKNOWN = 'Not recorded';

export function formatDateOfBirth(dob: string | undefined): string {
  if (!dob) return UNKNOWN;
  // The API sends a plain `yyyy-MM-dd`. `fromISO` on a date-only string is
  // zone-independent, so there is no barn-vs-phone question here.
  const date = DateTime.fromISO(dob);
  return date.isValid ? date.toFormat('dd LLLL yyyy') : UNKNOWN;
}

/** Height is centimetres in the API; imperial users read hands. */
export function formatHeight(height: number | undefined, isMetric: boolean): string {
  if (height == null || Number.isNaN(height)) return UNKNOWN;
  return isMetric ? `${height.toFixed(2)} cm` : `${(height / 10.16).toFixed(2)} hands`;
}

/** Weight is kilograms in the API. */
export function formatWeight(weight: number | undefined, isMetric: boolean): string {
  if (weight == null || Number.isNaN(weight)) return UNKNOWN;
  return isMetric ? `${weight.toFixed(2)} kg` : `${(weight * 2.20462).toFixed(2)} lbs`;
}

/** Gender and breed arrive as free text; capitalise for display only. */
function titleCase(value: string | undefined): string {
  if (!value) return UNKNOWN;
  const trimmed = value.trim();
  if (!trimmed) return UNKNOWN;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * The stall monitor's device id, when the API expanded the relation.
 *
 * `current_stall_monitor_deviceinstance` is `string | null | IDeviceInstance`:
 * an unexpanded response gives the relation's own id, which is not the number
 * printed on the device and must not be shown as if it were.
 */
export function monitorDeviceId(stall: IStall | undefined): string | undefined {
  const device = stall?.current_stall_monitor_deviceinstance;
  if (!device || typeof device === 'string') return undefined;
  return device.device_id || undefined;
}

export interface PassportInput {
  animal: IAnimal | undefined;
  stall: IStall | undefined;
  /** Group names this horse belongs to, already resolved by the caller. */
  groupNames: string[];
  isMetric: boolean;
}

/**
 * The passport, with the four fields that used to sit behind the settings cog
 * folded in — Assigned Stall, Groups and Device ID (Inakshi, 2026-08-17, D1).
 * Name is the page title, so it is not repeated as a row.
 */
export function buildPassport({
  animal,
  stall,
  groupNames,
  isMetric,
}: PassportInput): PassportField[] {
  return [
    { id: 'registeredName', label: 'Registered name', value: animal?.registered_name?.trim() || UNKNOWN },
    { id: 'gender', label: 'Gender', value: titleCase(animal?.gender) },
    { id: 'dob', label: 'Date of birth', value: formatDateOfBirth(animal?.dob) },
    { id: 'breed', label: 'Breed', value: titleCase(animal?.breed) },
    { id: 'height', label: 'Height', value: formatHeight(animal?.height, isMetric) },
    { id: 'weight', label: 'Weight', value: formatWeight(animal?.weight, isMetric) },
    { id: 'stall', label: 'Assigned stall', value: stall?.name?.trim() || 'No stall assigned' },
    {
      id: 'groups',
      label: groupNames.length === 1 ? 'Group' : 'Groups',
      value: groupNames.length ? groupNames.join(', ') : 'No groups',
    },
    { id: 'device', label: 'Stall monitor', value: monitorDeviceId(stall) ?? 'None assigned' },
  ];
}
