import { AlertApplicationTypes } from '@/config/enums/alert-application-types';
import { AlertFilter } from '@/config/enums/alert-filter';

import { applyTag, idsFromRule, notifyTag, scopeFromRule, selectionToApi, targetToApi } from '../scope';
import type { RuleScope } from '../types';

const horses = (apply: RuleScope['apply'], notify: RuleScope['notify'] = { mode: 'all' }): RuleScope => ({
  target: 'horses',
  apply,
  notify,
});
const stalls = (apply: RuleScope['apply']): RuleScope => ({ target: 'stalls', apply, notify: { mode: 'all' } });

describe('applyTag — the words a customer sees, same as the shipping app', () => {
  it.each([
    [horses({ mode: 'all' }), 'All Horses'],
    [stalls({ mode: 'all' }), 'All Stalls'],
    [horses({ mode: 'include', ids: ['a'] }), '1 Horse'],
    [horses({ mode: 'include', ids: ['a', 'b', 'c'] }), '3 Horses'],
    [stalls({ mode: 'include', ids: ['a', 'b'] }), '2 Stalls'],
    [horses({ mode: 'include', ids: [] }), 'No Horses'],
    [horses({ mode: 'exclude', ids: ['a', 'b'] }), 'All except 2'],
    [horses({ mode: 'exclude', ids: [] }), 'All Horses'],
  ])('%j → %s', (scope, expected) => {
    expect(applyTag(scope)).toBe(expected);
  });
});

describe('notifyTag', () => {
  const me = 'member-me';
  const cases: [RuleScope['notify'], string][] = [
    [{ mode: 'all' }, 'Everyone'],
    [{ mode: 'include', ids: [me] }, 'Me'],
    [{ mode: 'include', ids: ['member-x'] }, '1 Person'],
    [{ mode: 'include', ids: ['a', 'b', 'c', 'd'] }, '4 People'],
    [{ mode: 'include', ids: [] }, 'No People'],
    [{ mode: 'exclude', ids: ['a', 'b'] }, 'Everyone except 2'],
    [{ mode: 'exclude', ids: [] }, 'Everyone'],
  ];
  it.each(cases)('%j → %s', (notify, expected) => {
    expect(notifyTag(horses({ mode: 'all' }, notify), me)).toBe(expected);
  });

  it('"Me" needs the current member id; without it, a single member is "1 Person"', () => {
    expect(notifyTag(horses({ mode: 'all' }, { mode: 'include', ids: [me] }), null)).toBe('1 Person');
  });
});

describe('idsFromRule — embedded relations win over flat ids, deleted relations are ignored', () => {
  it('prefers live relations', () => {
    expect(
      idsFromRule({
        alert_application_rules: [
          { object_id: 'h1' },
          { object_id: 'h2', deleted_at: '2026-01-01' },
        ],
        rule_application_ids: ['stale'],
        alert_notification_rules: [{ member_id: 'm1' }, { object_id: 'm2' }],
        rule_notification_ids: ['stale-m'],
      }),
    ).toEqual({ apply: ['h1'], notify: ['m1', 'm2'] });
  });

  it('falls back to flat ids when relations are absent or all deleted', () => {
    expect(
      idsFromRule({
        alert_application_rules: [{ object_id: 'gone', deleted_at: 'x' }],
        rule_application_ids: ['h9'],
        rule_notification_ids: ['m9'],
      }),
    ).toEqual({ apply: ['h9'], notify: ['m9'] });
    expect(idsFromRule({})).toEqual({ apply: [], notify: [] });
  });
});

describe('scopeFromRule / selectionToApi / targetToApi round-trip', () => {
  it('reads a stall include / member exclude rule', () => {
    const scope = scopeFromRule({
      apply_type: AlertApplicationTypes.STALL,
      apply_condition: AlertFilter.INCLUDE,
      rule_application_ids: ['s1', 's2'],
      notify_condition: AlertFilter.EXCLUDE,
      rule_notification_ids: ['m1'],
    });
    expect(scope).toEqual({
      target: 'stalls',
      apply: { mode: 'include', ids: ['s1', 's2'] },
      notify: { mode: 'exclude', ids: ['m1'] },
    });
    expect(selectionToApi(scope.apply)).toEqual({ condition: AlertFilter.INCLUDE, ids: ['s1', 's2'] });
    expect(selectionToApi(scope.notify)).toEqual({ condition: AlertFilter.EXCLUDE, ids: ['m1'] });
    expect(targetToApi(scope.target)).toBe(AlertApplicationTypes.STALL);
  });

  it('treats a string-typed condition (as the API sometimes sends) the same as a number', () => {
    expect(scopeFromRule({ apply_type: '2', apply_condition: '1', notify_condition: '1' })).toEqual({
      target: 'horses',
      apply: { mode: 'all' },
      notify: { mode: 'all' },
    });
    expect(selectionToApi({ mode: 'all' })).toEqual({ condition: AlertFilter.ALL, ids: [] });
    expect(targetToApi('horses')).toBe(AlertApplicationTypes.HORSE);
  });
});
