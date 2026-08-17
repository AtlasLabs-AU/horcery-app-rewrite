/**
 * `describeRule` — one API rule → everything a Manage Alerts row shows.
 * Pure composition of the domain functions; the row component renders it and
 * nothing else. Tested through the golden fixtures.
 */

import type { DateTime } from 'luxon';

import type { IconName } from '@/components/ui/icon-names';

import { toForm } from './payload';
import { applyTag, notifyTag, scopeFromRule } from './scope';
import { ruleSummary } from './summary';
import type { AlertRuleForm, AlertTypeDescriptor, Drift, ServerAlertRule, Units } from './types';
import { detectDrift, readWindowMetadata } from './window';

export interface AlertRuleView {
  id: string;
  typeName: string;
  icon: IconName;
  sentence: string;
  applyTag: string;
  notifyTag: string;
  /** Present when the stored window no longer means what was set. */
  drift: Drift | null;
  /** The server sent a type the registry does not know. */
  isGeneric: boolean;
  /** Push delivery is off on this rule (read faithfully; the old app allowed it). */
  pushOff: boolean;
  form: AlertRuleForm;
  descriptor: AlertTypeDescriptor;
}

export interface DescribeContext {
  descriptorsById: Map<string, AlertTypeDescriptor>;
  units: Units;
  zone: string;
  zoneFallback: boolean;
  now: DateTime;
  currentMemberId: string | null | undefined;
}

export function describeRule(rule: ServerAlertRule, ctx: DescribeContext): AlertRuleView | null {
  const typeId = typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type?.id ?? '');
  const descriptor = ctx.descriptorsById.get(typeId);
  if (!descriptor || !rule.id) return null;

  const form = toForm(rule, descriptor, ctx.units, ctx.zone, ctx.now, ctx.zoneFallback);
  const scope = scopeFromRule(rule);
  const meta = readWindowMetadata(rule.UNATTESTED_META_DATA);

  return {
    id: rule.id,
    typeName: descriptor.name,
    icon: descriptor.icon,
    sentence: ruleSummary(form, descriptor, ctx.units),
    applyTag: applyTag(scope),
    notifyTag: notifyTag(scope, ctx.currentMemberId),
    drift: detectDrift(meta, ctx.zone, ctx.now),
    isGeneric: descriptor.isGeneric,
    pushOff: rule.is_push === false,
    form,
    descriptor,
  };
}

/** Human line for a drift badge / banner. */
export function driftLabel(drift: Drift): string {
  // Short enough for a badge; Configure shows the from → to zones in full.
  if (drift.kind === 'zone') return 'Barn timezone changed since saved';
  const h = Math.abs(drift.minutes) / 60;
  const amount = Number.isInteger(h) ? `${h} h` : `${Math.abs(drift.minutes)} min`;
  return `Shifted ${amount} since the clocks changed`;
}
