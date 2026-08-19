import { CATEGORY_LABEL, categoryFromServer, resolveDescriptor, resolveDescriptors } from '../descriptors';
import type { ServerAlertType } from '../types';

import typesFixture from '../__fixtures__/alert-types.json';

const TYPES = typesFixture as unknown as ServerAlertType[];
const by = (slug: string) => TYPES.find((t) => t.slug === slug)!;

describe('resolveDescriptor — registry + server AppMetaData', () => {
  it('resolves all nine server types as known, none generic', () => {
    const { list, bySlug } = resolveDescriptors(TYPES, 'metric');
    expect(list.every((d) => !d.isGeneric)).toBe(true);
    expect([...bySlug.keys()].sort()).toEqual([
      'entering-stall',
      'exiting-stall',
      'light',
      'lying-down-count',
      'lying-down-time',
      'people-in-stall',
      'people-in-stall-time',
      'temp-change',
      'temperature',
    ]);
  });

  it('temperature: degrees, °C/°F, server presets 10/20/30/40 (same numbers in either unit system)', () => {
    const d = resolveDescriptor(by('temperature'), 'metric');
    expect(d.threshold.kind).toBe('degrees');
    expect(d.threshold.unit).toEqual({ metric: '°C', imperial: '°F' });
    expect(d.threshold.presets?.map((p) => p.value)).toEqual([10, 20, 30, 40]);
    expect(d.category).toBe('environmental');
    expect(d.basedOn).toBeUndefined();
    expect(d.queryRange).toBeUndefined();
  });

  it('temp-change: presets 5/10/15/20 and a REQUIRED "within any"', () => {
    const d = resolveDescriptor(by('temp-change'), 'metric');
    expect(d.threshold.presets?.map((p) => p.value)).toEqual([5, 10, 15, 20]);
    expect(d.queryRange?.required).toBe(true);
  });

  it('lying-down-time: duration kind, presets from the SECONDS scale shown in minutes, two "based on" shapes', () => {
    const d = resolveDescriptor(by('lying-down-time'), 'metric');
    expect(d.threshold.kind).toBe('duration');
    expect(d.threshold.presets?.map((p) => p.value)).toEqual([15, 30, 45, 60, 90]);
    expect(d.basedOn?.map((o) => o.value)).toEqual([1, 2]);
    expect(d.window.minMinutes).toBe(120);
  });

  it('people-in-stall-time: same shape, its own scale and window minimum', () => {
    const d = resolveDescriptor(by('people-in-stall-time'), 'metric');
    expect(d.threshold.presets?.map((p) => p.value)).toEqual([5, 10, 15, 20]);
    expect(d.window.minMinutes).toBe(60);
    expect(d.category).toBe('presence');
  });

  it('light: selection Low/High from selectables; the duration scale feeds the TRIGGER presets', () => {
    const d = resolveDescriptor(by('light'), 'metric');
    expect(d.threshold.kind).toBe('selection');
    expect(d.threshold.options).toEqual([
      { label: 'Low', value: 0 },
      { label: 'High', value: 1 },
    ]);
    expect(d.threshold.presets).toBeUndefined();
    expect(d.triggerDuration?.presetsMinutes).toEqual([1, 5, 10, 20, 30]);
  });

  it('lying-down-count: count with presets 1–5 and required "within any"', () => {
    const d = resolveDescriptor(by('lying-down-count'), 'metric');
    expect(d.threshold.kind).toBe('count');
    expect(d.threshold.presets?.map((p) => p.value)).toEqual([1, 2, 3, 4, 5]);
    expect(d.queryRange?.required).toBe(true);
  });

  it('boolean presence types: entering / exiting / people-in-stall', () => {
    for (const slug of ['entering-stall', 'exiting-stall', 'people-in-stall']) {
      const d = resolveDescriptor(by(slug), 'metric');
      expect(d.threshold.kind).toBe('boolean');
      expect(d.category).toBe('presence');
      expect(d.threshold.presets).toBeUndefined();
    }
    expect(resolveDescriptor(by('people-in-stall'), 'metric').triggerDuration?.presetsMinutes).toEqual([1, 5, 10, 20, 30]);
    expect(resolveDescriptor(by('entering-stall'), 'metric').triggerDuration).toBeUndefined();
  });

  it('an unknown slug (e.g. rolling-count, which the server does NOT have) falls back to generic and says so', () => {
    const d = resolveDescriptor({
      id: 'x',
      slug: 'rolling-count',
      name: 'Rolling Events',
      category: 2,
      AppMetaData: { sensitivity_scale: { '0': { name: '1', value: 1 } } },
    }, 'metric');
    expect(d.isGeneric).toBe(true);
    expect(d.slug).toBe('generic');
    expect(d.name).toBe('Rolling Events');
    expect(d.category).toBe('behavioural'); // server category is the best we have
    expect(d.threshold.kind).toBe('number');
    expect(d.threshold.presets?.map((p) => p.value)).toEqual([1]); // server presets still merge in
  });

  it('a malformed AppMetaData never throws', () => {
    expect(() =>
      resolveDescriptor({ id: 'y', slug: 'temperature', name: 'T', AppMetaData: { sensitivity_scale: 'nope' } }, 'metric'),
    ).not.toThrow();
    expect(() => resolveDescriptor({ id: 'z', slug: 'light', name: 'L', AppMetaData: null }, 'metric')).not.toThrow();
  });
});

describe('categories', () => {
  it('maps the server numbers; 3 (security) reads as Presence', () => {
    expect(categoryFromServer(1)).toBe('environmental');
    expect(categoryFromServer(2)).toBe('behavioural');
    expect(categoryFromServer(3)).toBe('presence');
    expect(categoryFromServer(4)).toBe('general');
    expect(categoryFromServer(undefined)).toBe('general');
    expect(CATEGORY_LABEL.presence).toBe('Presence');
  });
});
