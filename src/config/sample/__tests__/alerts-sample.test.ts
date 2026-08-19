import { DateTime } from 'luxon';

import { SAMPLE_ALERT_RULES, SAMPLE_ALERT_TYPES, SAMPLE_CURRENT_MEMBER_ID } from '@/config/sample/alerts-sample';
import { resolveDescriptors } from '@/domain/alerts/descriptors';
import { describeRule } from '@/domain/alerts/view';

describe('Alerts sample preview', () => {
  const { byId } = resolveDescriptors(SAMPLE_ALERT_TYPES, 'metric');
  const ctx = {
    descriptorsById: byId,
    units: 'metric' as const,
    zone: 'America/Chicago',
    zoneFallback: false,
    now: DateTime.fromISO('2026-01-15T12:00:00Z'),
    currentMemberId: SAMPLE_CURRENT_MEMBER_ID,
  };

  it('uses the real server alert types (A0), never invented ones', () => {
    expect(SAMPLE_ALERT_TYPES).toHaveLength(9);
    for (const rule of SAMPLE_ALERT_RULES) {
      expect(byId.has(rule.alert_type as string)).toBe(true);
    }
  });

  it('covers every row feature the design review needs to see', () => {
    const views = SAMPLE_ALERT_RULES.map((r) => describeRule(r, ctx)!);
    expect(views.every(Boolean)).toBe(true);
    const kinds = new Set(views.map((v) => v.descriptor.threshold.kind));
    expect(kinds).toEqual(new Set(['degrees', 'count', 'duration', 'selection', 'boolean']));
    expect(views.some((v) => v.drift?.kind === 'offset')).toBe(true); // drift badge
    expect(views.some((v) => v.applyTag === '2 Horses')).toBe(true); // include scope
    expect(views.some((v) => v.notifyTag === 'Me')).toBe(true); // "Me"
    expect(views.some((v) => v.sentence.includes('in total'))).toBe(true); // combined shape
    expect(views.some((v) => v.sentence.includes('drops by'))).toBe(true); // temp-change
  });
});
