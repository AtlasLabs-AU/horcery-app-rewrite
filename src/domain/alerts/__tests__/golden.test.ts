/**
 * Golden round-trip over the REAL rules pulled in A0 (anonymised).
 *
 * For every fixture rule: toForm → toPayload must reproduce each writable
 * field the server stored. If a future change to the domain layer alters
 * how any of the nine types is written, this fails and names the rule.
 *
 * Windows compare to the MINUTE (the API pair carries seconds — `:59` on
 * "any time" ends — that the form deliberately does not model).
 */

import { DateTime } from 'luxon';

import { resolveDescriptors } from '../descriptors';
import { emptyForm, toForm, toPayload } from '../payload';
import { ruleSummary } from '../summary';
import { validate } from '../validate';
import type { ServerAlertRule, ServerAlertType, Units } from '../types';

import rulesFixture from '../__fixtures__/alert-rules.json';
import typesFixture from '../__fixtures__/alert-types.json';
import orgFixture from '../__fixtures__/organization.json';

const TYPES = typesFixture as unknown as ServerAlertType[];
const RULES = rulesFixture as unknown as ServerAlertRule[];
const ZONE = orgFixture.timezone as string; // America/Chicago
// A fixed summer instant; the rules were authored in summer (A0 §2.2).
const ON = DateTime.fromISO('2026-07-15T12:00:00Z');

const { byId } = resolveDescriptors(TYPES);

/** A rule saved with `display_value` was authored in imperial units. */
function unitsFor(rule: ServerAlertRule): Units {
  return rule.display_value != null ? 'imperial' : 'metric';
}

const toMinute = (hms: string | null | undefined) => (hms ?? '').slice(0, 5);
const minutesOf = (hms: string | null | undefined) => {
  const [h = 0, m = 0] = (hms ?? '').split(':').map(Number);
  return h * 60 + m;
};
const isWholeDayPair = (start: string | null | undefined, end: string | null | undefined) => {
  let diff = minutesOf(end) - minutesOf(start);
  if (diff < 0) diff += 24 * 60;
  return diff >= 24 * 60 - 2;
};

describe('A0 fixtures', () => {
  it('has the nine server types and 31 rules', () => {
    expect(TYPES).toHaveLength(9);
    expect(RULES).toHaveLength(31);
    expect(ZONE).toBe('America/Chicago');
  });

  it('every rule resolves to a known (non-generic) descriptor', () => {
    for (const rule of RULES) {
      const id = typeof rule.alert_type === 'string' ? rule.alert_type : rule.alert_type.id;
      const d = byId.get(id ?? '');
      expect(d).toBeDefined();
      expect(d!.isGeneric).toBe(false);
    }
  });
});

describe('golden: toForm → toPayload reproduces every stored rule', () => {
  it.each(RULES.map((rule) => [rule.id, rule] as const))('%s', (_id, rule) => {
    const typeId = typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type.id ?? '');
    const descriptor = byId.get(typeId)!;
    const units = unitsFor(rule);

    const form = toForm(rule, descriptor, units, ZONE, ON);
    const payload = toPayload(form, descriptor, {
      organizationId: 'org-qa',
      units,
      mode: 'create',
      on: ON,
    });

    expect(payload.alert_type).toBe(typeId);
    expect(payload.condition).toBe(rule.condition);
    expect(payload.threshold_value).toBeCloseTo(Number(rule.threshold_value), 1);
    expect(payload.display_value).toBe(rule.display_value ?? null);
    expect(payload.is_custom).toBe(!!rule.is_custom);
    expect(payload.is_custom_duration).toBe(!!rule.is_custom_duration);
    expect(payload.trigger_duration).toBe(rule.trigger_duration ?? null);
    expect(payload.query_range_duration).toBe(rule.query_range_duration ?? null);
    if (descriptor.basedOn) {
      expect(payload.query_type).toBe(Number(rule.query_type ?? 1));
    } else {
      expect(payload.query_type).toBeUndefined();
    }
    // Windows compare to the minute — except a whole-day pair, which may
    // legitimately re-save anchored to the BARN day (00:00–23:59 UTC written by
    // the old app reads as any time and comes back as Chicago's whole day).
    if (isWholeDayPair(rule.evaluation_start_time, rule.evaluation_end_time)) {
      expect(isWholeDayPair(payload.evaluation_start_time, payload.evaluation_end_time)).toBe(true);
    } else {
      expect(toMinute(payload.evaluation_start_time)).toBe(toMinute(rule.evaluation_start_time));
      expect(toMinute(payload.evaluation_end_time)).toBe(toMinute(rule.evaluation_end_time));
    }
    expect(payload.apply_type).toBe(Number(rule.apply_type));
    expect(payload.apply_condition).toBe(Number(rule.apply_condition));
    expect(payload.notify_condition).toBe(Number(rule.notify_condition));
    expect(payload.is_push).toBe(rule.is_push);
    expect(payload.is_sms).toBe(false);
    expect(payload.is_email).toBe(false);
    // scope ids come from the embedded relations (the flat arrays are never returned)
    const liveNotify = (rule.alert_notification_rules ?? [])
      .filter((r) => r.deleted_at == null)
      .map((r) => r.member_id ?? r.object_id ?? r.id);
    expect(payload.rule_notification_ids).toEqual(liveNotify);
    // and the metadata block we add is well-formed
    expect(payload.UNATTESTED_META_DATA.window).toMatchObject({ zone: ZONE, saved_offset_min: -300 });
  });
});

describe('summary sentences for the real rules', () => {
  it('produces a sentence for every rule and never leaks a raw placeholder', () => {
    for (const rule of RULES) {
      const typeId = typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type.id ?? '');
      const descriptor = byId.get(typeId)!;
      const units = unitsFor(rule);
      const sentence = ruleSummary(toForm(rule, descriptor, units, ZONE, ON), descriptor, units);
      expect(sentence.startsWith('You will be notified if ')).toBe(true);
      expect(sentence).not.toContain('undefined');
      expect(sentence).not.toContain('NaN');
      expect(sentence).not.toContain('…');
    }
  });

  it('reads the barn window in barn time: 11:30–18:00 UTC is 6:30 AM – 1:00 PM in Chicago (summer)', () => {
    const rule = RULES.find((r) => r.evaluation_start_time === '11:30:00')!;
    const typeId = typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type.id ?? '');
    const d = byId.get(typeId)!;
    const sentence = ruleSummary(toForm(rule, d, unitsFor(rule), ZONE, ON), d, unitsFor(rule));
    expect(sentence).toContain('between 6:30 AM and 1:00 PM');
  });

  it.each([
    ['temperature', 'imperial', 'temperature is more than 30 °F'],
    ['temp-change', 'metric', 'temperature drops by 10 °C within any 1 h'],
    ['lying-down-time', 'metric', 'your horses lie down for more than 2 h in total'],
    ['people-in-stall-time', 'metric', 'no one is in your stall for 5 min'],
    ['light', 'metric', 'light level is High for 20 min'],
  ])('%s (%s): "%s"', (slug, units, expected) => {
    const found = RULES.map((r) => {
      const typeId = typeof r.alert_type === 'string' ? r.alert_type : (r.alert_type.id ?? '');
      const d = byId.get(typeId)!;
      return d.slug === slug ? ruleSummary(toForm(r, d, units as Units, ZONE, ON), d, units as Units) : null;
    }).filter((s): s is string => !!s);
    expect(found.some((s) => s.includes(expected))).toBe(true);
  });
});

describe('every real rule is valid against its descriptor', () => {
  it.each(RULES.map((rule) => [rule.id, rule] as const))('%s', (_id, rule) => {
    const typeId = typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type.id ?? '');
    const d = byId.get(typeId)!;
    const errors = validate(toForm(rule, d, unitsFor(rule), ZONE, ON), d);
    // Reading is faithful; the ONLY validation failure real rules may hit is
    // a window shorter than the type's minimum (the 7-minute test rule).
    const keys = Object.keys(errors);
    expect(keys.filter((k) => k !== 'window')).toEqual([]);
  });
});

describe('emptyForm', () => {
  it('starts every known type valid or with only the fields a user must fill', () => {
    for (const d of byId.values()) {
      const form = emptyForm(d, ZONE);
      const errors = validate(form, d);
      // presets fill values; nothing should be missing for the QA types
      expect(errors).toEqual({});
    }
  });
});
