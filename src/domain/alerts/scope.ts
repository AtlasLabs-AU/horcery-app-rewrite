/**
 * Who a rule applies to, and who it notifies — read from an API rule and
 * rendered as the two tags on every Manage Alerts row.
 *
 * Behaviour is the shipping app's (`getApplicationTagText` /
 * `getUsersTagText` in manage-alerts), reproduced exactly so a customer sees
 * the same words: "All Horses", "3 Stalls", "All except 2", "Everyone",
 * "Me", "4 People", "No People". Architecture §4.3; plan §3.1.
 */

import { AlertApplicationTypes } from '@/config/enums/alert-application-types';
import { AlertFilter } from '@/config/enums/alert-filter';

import type { RuleScope, Selection } from './types';

interface RelationLike {
  object_id?: string;
  member_id?: string;
  id?: string;
  deleted_at?: string | null;
}

interface RuleLike {
  apply_type?: number | string | null;
  apply_condition?: number | string | null;
  notify_condition?: number | string | null;
  rule_application_ids?: string[] | null;
  rule_notification_ids?: string[] | null;
  alert_application_rules?: RelationLike[] | null;
  alert_notification_rules?: RelationLike[] | null;
}

// ------------------------------------------------------------ read

/**
 * Ids from the embedded relations when present (live, non-deleted), else
 * from the flat id arrays. Same precedence as the shipping app.
 */
export function idsFromRule(rule: RuleLike): { apply: string[]; notify: string[] } {
  return {
    apply: relationIds(rule.alert_application_rules, (r) => r.object_id ?? r.id) ??
      (rule.rule_application_ids ?? []).filter(Boolean),
    notify: relationIds(rule.alert_notification_rules, (r) => r.member_id ?? r.object_id ?? r.id) ??
      (rule.rule_notification_ids ?? []).filter(Boolean),
  };
}

function relationIds(
  relations: RelationLike[] | null | undefined,
  pick: (r: RelationLike) => string | undefined,
): string[] | null {
  if (!Array.isArray(relations) || relations.length === 0) return null;
  const ids = relations
    .filter((r) => r && r.deleted_at == null)
    .map(pick)
    .filter((id): id is string => !!id);
  return ids.length > 0 ? ids : null;
}

function toSelection(condition: number | string | null | undefined, ids: string[]): Selection {
  const c = Number(condition);
  if (c === AlertFilter.EXCLUDE) return { mode: 'exclude', ids };
  if (c === AlertFilter.INCLUDE) return { mode: 'include', ids };
  return { mode: 'all' };
}

/** The scope of an API rule. */
export function scopeFromRule(rule: RuleLike): RuleScope {
  const { apply, notify } = idsFromRule(rule);
  const target = Number(rule.apply_type) === AlertApplicationTypes.STALL ? 'stalls' : 'horses';
  return {
    target,
    apply: toSelection(rule.apply_condition, apply),
    notify: toSelection(rule.notify_condition, notify),
  };
}

// ------------------------------------------------------------ write

export function selectionToApi(selection: Selection): { condition: AlertFilter; ids: string[] } {
  switch (selection.mode) {
    case 'all':
      return { condition: AlertFilter.ALL, ids: [] };
    case 'include':
      return { condition: AlertFilter.INCLUDE, ids: selection.ids };
    case 'exclude':
      return { condition: AlertFilter.EXCLUDE, ids: selection.ids };
  }
}

export function targetToApi(target: RuleScope['target']): AlertApplicationTypes {
  return target === 'stalls' ? AlertApplicationTypes.STALL : AlertApplicationTypes.HORSE;
}

// ------------------------------------------------------------ tags

/** "All Horses" / "3 Stalls" / "All except 2" / "No Horses". */
export function applyTag(scope: RuleScope): string {
  const singular = scope.target === 'stalls' ? 'Stall' : 'Horse';
  const plural = scope.target === 'stalls' ? 'Stalls' : 'Horses';
  const sel = scope.apply;
  if (sel.mode === 'all') return `All ${plural}`;
  const n = sel.ids.length;
  if (sel.mode === 'exclude') return n > 0 ? `All except ${n}` : `All ${plural}`;
  if (n === 0) return `No ${plural}`;
  return `${n} ${n === 1 ? singular : plural}`;
}

/** "Everyone" / "Me" / "4 People" / "Everyone except 2" / "No People". */
export function notifyTag(scope: RuleScope, currentMemberId: string | null | undefined): string {
  const sel = scope.notify;
  if (sel.mode === 'all') return 'Everyone';
  const n = sel.ids.length;
  if (sel.mode === 'exclude') return n > 0 ? `Everyone except ${n}` : 'Everyone';
  if (n === 0) return 'No People';
  if (n === 1 && currentMemberId && sel.ids[0] === currentMemberId) return 'Me';
  return `${n} ${n === 1 ? 'Person' : 'People'}`;
}
