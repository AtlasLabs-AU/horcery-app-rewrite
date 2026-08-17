import { DateTime } from 'luxon';

import {
  buildWindowMetadata,
  detectDrift,
  fromStorage,
  isAnyTime,
  localToUtcClock,
  parseClock,
  readWindowMetadata,
  resolveZone,
  toStorage,
  utcToLocalClock,
  windowFromMetadata,
  windowMinutes,
} from '../window';
import type { AlertWindow } from '../types';

/**
 * Fixed instants — one in local summer, one in local winter — for each zone.
 * The whole point of this module is that these produce DIFFERENT UTC pairs
 * for the SAME barn window, and that we can round-trip either way.
 */
const NY = 'America/New_York'; // -4 (EDT) / -5 (EST)
const SYD = 'Australia/Sydney'; // +11 (AEDT, Jan) / +10 (AEST, Jul)
const LON = 'Europe/London'; // +1 (BST) / 0 (GMT)
const KOL = 'Asia/Kolkata'; // +5:30 all year (half-hour zone, no DST)

const JULY = DateTime.fromISO('2026-07-15T12:00:00Z');
const JAN = DateTime.fromISO('2026-01-15T12:00:00Z');

const custom = (zone: string, sh: number, sm: number, eh: number, em: number): AlertWindow => ({
  mode: 'custom',
  start: { hour: sh, minute: sm },
  end: { hour: eh, minute: em },
  zone,
  zoneFallback: false,
});

describe('resolveZone', () => {
  it('uses a valid organization zone', () => {
    expect(resolveZone(NY)).toEqual({ zone: NY, fallback: false });
  });
  it('falls back to the device zone and SAYS SO when missing or invalid', () => {
    expect(resolveZone(null).fallback).toBe(true);
    expect(resolveZone('Mars/Olympus').fallback).toBe(true);
    expect(typeof resolveZone(undefined).zone).toBe('string');
  });
});

describe('parseClock', () => {
  it('accepts HH:MM and HH:MM:SS, rejects nonsense', () => {
    expect(parseClock('21:00')).toEqual({ hour: 21, minute: 0 });
    expect(parseClock('06:30:00')).toEqual({ hour: 6, minute: 30 });
    expect(parseClock('24:00')).toBeNull();
    expect(parseClock('9')).toBeNull();
    expect(parseClock(null)).toBeNull();
  });
});

describe('local ⇄ UTC clock conversion uses the BARN zone at the given instant', () => {
  it.each([
    // zone, instant, barn 21:00 → UTC
    [NY, JULY, { hour: 1, minute: 0 }], // EDT: 21:00 - (-4) = 01:00 next day
    [NY, JAN, { hour: 2, minute: 0 }], // EST: 21:00 - (-5) = 02:00
    [SYD, JAN, { hour: 10, minute: 0 }], // AEDT +11: 21:00 → 10:00
    [SYD, JULY, { hour: 11, minute: 0 }], // AEST +10: 21:00 → 11:00
    [LON, JULY, { hour: 20, minute: 0 }], // BST +1
    [LON, JAN, { hour: 21, minute: 0 }], // GMT
    [KOL, JULY, { hour: 15, minute: 30 }], // +5:30 → 15:30
    [KOL, JAN, { hour: 15, minute: 30 }],
  ])('%s at %s: barn 21:00 → UTC %o', (zone, on, expected) => {
    expect(localToUtcClock({ hour: 21, minute: 0 }, zone, on)).toEqual(expected);
    // and back
    expect(utcToLocalClock(expected, zone, on)).toEqual({ hour: 21, minute: 0 });
  });

  it('the SAME barn window is a DIFFERENT UTC pair in summer and winter — this is the DST fact', () => {
    const w = custom(NY, 21, 0, 6, 0);
    expect(toStorage(w, JULY)).toEqual({ start: '01:00:00', end: '10:00:00' });
    expect(toStorage(w, JAN)).toEqual({ start: '02:00:00', end: '11:00:00' });
  });
});

describe('toStorage / fromStorage round-trip', () => {
  it.each([
    [NY, JULY],
    [NY, JAN],
    [SYD, JULY],
    [SYD, JAN],
    [LON, JULY],
    [LON, JAN],
    [KOL, JULY],
  ])('overnight 21:00→06:00 in %s round-trips at %s', (zone, on) => {
    const w = custom(zone, 21, 0, 6, 0);
    const stored = toStorage(w, on);
    const back = fromStorage(stored.start, stored.end, zone, on);
    expect(back).toEqual(w);
    expect(windowMinutes(back)).toBe(9 * 60);
  });

  it.each([
    [NY, JULY],
    [SYD, JAN],
    [KOL, JAN],
  ])('a daytime window 09:00→17:00 in %s round-trips at %s', (zone, on) => {
    const w = custom(zone, 9, 0, 17, 0);
    const stored = toStorage(w, on);
    expect(fromStorage(stored.start, stored.end, zone, on)).toEqual(w);
    expect(windowMinutes(w)).toBe(8 * 60);
  });

  it('a half-hour zone keeps its minutes', () => {
    const w = custom(KOL, 21, 30, 6, 15);
    const stored = toStorage(w, JAN);
    expect(stored).toEqual({ start: '16:00:00', end: '00:45:00' });
    expect(fromStorage(stored.start, stored.end, KOL, JAN)).toEqual(w);
  });
});

describe('"any time"', () => {
  it('stores the whole BARN day, which wraps in UTC for any non-UTC zone', () => {
    const w: AlertWindow = { mode: 'any', zone: NY, zoneFallback: false };
    // NY July: 00:00 EDT = 04:00 UTC; 23:59 EDT = 03:59 UTC — start > end, and that is expected.
    expect(toStorage(w, JULY)).toEqual({ start: '04:00:00', end: '03:59:59' });
  });

  it('is recognised when read back, in either season', () => {
    const w: AlertWindow = { mode: 'any', zone: SYD, zoneFallback: false };
    for (const on of [JULY, JAN]) {
      const stored = toStorage(w, on);
      const back = fromStorage(stored.start, stored.end, SYD, on);
      expect(back.mode).toBe('any');
      expect(isAnyTime(back)).toBe(true);
      expect(windowMinutes(back)).toBe(24 * 60);
    }
  });

  it('a malformed or missing pair reads as any time rather than crashing', () => {
    expect(fromStorage(null, null, NY, JULY).mode).toBe('any');
    expect(fromStorage('nope', '25:99', NY, JULY).mode).toBe('any');
  });
});

describe('windowMinutes', () => {
  it('wraps overnight exactly as the shipping app counts', () => {
    expect(windowMinutes(custom(NY, 22, 0, 2, 0))).toBe(4 * 60);
    expect(windowMinutes(custom(NY, 23, 30, 0, 15))).toBe(45);
    expect(windowMinutes(custom(NY, 8, 0, 8, 0))).toBe(0);
  });
});

describe('metadata + drift', () => {
  it('records barn-local times and the offset in force at save', () => {
    const w = custom(NY, 21, 0, 6, 0);
    const meta = buildWindowMetadata(w, JULY);
    expect(meta).toMatchObject({
      zone: NY,
      start_local: '21:00',
      end_local: '06:00',
      saved_offset_min: -240,
    });
    expect(meta.saved_at).toBe('2026-07-15T12:00:00.000Z');
    expect(readWindowMetadata({ window: meta })).toEqual(meta);
    expect(windowFromMetadata(meta)).toEqual(w);
  });

  it('reports OFFSET drift after a clock change: saved in July, read in January', () => {
    const meta = buildWindowMetadata(custom(NY, 21, 0, 6, 0), JULY);
    expect(detectDrift(meta, NY, JULY)).toBeNull();
    expect(detectDrift(meta, NY, JAN)).toEqual({ kind: 'offset', minutes: -60 });
  });

  it('reports ZONE drift when the organization moved timezone', () => {
    const meta = buildWindowMetadata(custom(NY, 21, 0, 6, 0), JULY);
    expect(detectDrift(meta, 'America/Chicago', JULY)).toEqual({
      kind: 'zone',
      from: NY,
      to: 'America/Chicago',
    });
  });

  it('claims NOTHING for rules without metadata (saved by the old app)', () => {
    expect(readWindowMetadata({})).toBeNull();
    expect(readWindowMetadata(null)).toBeNull();
    expect(readWindowMetadata({ window: { zone: 1 } })).toBeNull();
    expect(detectDrift(null, NY, JAN)).toBeNull();
  });

  it('a zone with no DST never drifts by offset', () => {
    const meta = buildWindowMetadata(custom(KOL, 21, 0, 6, 0), JULY);
    expect(detectDrift(meta, KOL, JAN)).toBeNull();
  });
});
