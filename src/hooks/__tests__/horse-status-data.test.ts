import { DateTime } from 'luxon';

import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import {
  activenessCategory,
  deriveInStallStatus,
  deriveOverlay,
  formatTemperature,
  isMetricsHidden,
  noiseCategory,
} from '@/hooks/horse-status-data';

const NOW = DateTime.fromISO('2026-08-17T12:00:00.000Z');

describe('deriveInStallStatus', () => {
  it('says no-camera before anything else, regardless of loading/error', () => {
    // A horse with no monitor has nothing to be "loading" or "unavailable" —
    // those words would imply a reading is coming.
    expect(
      deriveInStallStatus({ value: undefined, hasMonitor: false, canQuery: false, isLoading: true, isError: true }),
    ).toBe('no-camera');
  });

  it('distinguishes loading from unavailable from a genuine reading', () => {
    expect(
      deriveInStallStatus({ value: undefined, hasMonitor: true, canQuery: true, isLoading: true, isError: false }),
    ).toBe('loading');
    expect(
      deriveInStallStatus({ value: undefined, hasMonitor: true, canQuery: true, isLoading: false, isError: true }),
    ).toBe('unavailable');
    expect(
      deriveInStallStatus({ value: undefined, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('unavailable');
  });

  it('names the exclusion band instead of silently returning nothing', () => {
    // The current app returns `undefined` for 0.3–0.7 and draws no pill at
    // all — indistinguishable from a horse that is simply fine. This is the
    // bug the five-state model exists to fix.
    expect(
      deriveInStallStatus({ value: 0.3, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('unsure');
    expect(
      deriveInStallStatus({ value: 0.5, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('unsure');
    expect(
      deriveInStallStatus({ value: 0.7, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('unsure');
  });

  it('calls a monitor it cannot query "unavailable", not "no camera"', () => {
    // A stall can carry a monitor and no `prometheus_url`. Calling that "No
    // camera" contradicted the tile directly above it, which decides the same
    // question from `stall_url` (review, 2026-08-17). A monitor we cannot
    // reach is unreachable, not absent.
    expect(
      deriveInStallStatus({
        value: undefined,
        hasMonitor: true,
        canQuery: false,
        isLoading: false,
        isError: false,
      }),
    ).toBe('unavailable');
  });

  it('calls in or out just outside the exclusion band', () => {
    expect(
      deriveInStallStatus({ value: 0.71, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('in-stall');
    expect(
      deriveInStallStatus({ value: 0.29, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('out-of-stall');
    expect(
      deriveInStallStatus({ value: 1, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('in-stall');
    expect(
      deriveInStallStatus({ value: 0, hasMonitor: true, canQuery: true, isLoading: false, isError: false }),
    ).toBe('out-of-stall');
  });
});

describe('noiseCategory / activenessCategory', () => {
  it('categorises by the current app\'s thresholds', () => {
    expect(noiseCategory(65)).toBe('High');
    expect(noiseCategory(45)).toBe('Med');
    expect(noiseCategory(5)).toBe('Low');
    expect(activenessCategory(0.06)).toBe('High');
    expect(activenessCategory(0.02)).toBe('Med');
  });

  it('returns undefined rather than a wrong category for a missing value', () => {
    expect(noiseCategory(undefined)).toBeUndefined();
    expect(activenessCategory(Number.NaN)).toBeUndefined();
  });
});

describe('formatTemperature', () => {
  it('converts celsius to fahrenheit for imperial users', () => {
    expect(formatTemperature(20, true)).toBe('20°C');
    expect(formatTemperature(20, false)).toBe('68°F');
    expect(formatTemperature(0, false)).toBe('32°F');
  });

  it('returns undefined for a missing reading rather than "NaN°"', () => {
    expect(formatTemperature(undefined, true)).toBeUndefined();
  });
});

describe('isMetricsHidden', () => {
  it('is hidden strictly before the deadline and visible from it onward', () => {
    expect(isMetricsHidden('2026-08-17T13:00:00.000Z', NOW)).toBe(true);
    expect(isMetricsHidden('2026-08-17T12:00:00.000Z', NOW)).toBe(false);
    expect(isMetricsHidden('2026-08-17T11:00:00.000Z', NOW)).toBe(false);
  });

  it('never hides with no deadline set', () => {
    expect(isMetricsHidden(undefined, NOW)).toBe(false);
  });

  it('reflects a LIVE now rather than freezing at a captured instant', () => {
    // The bug being designed out: the current app captures `useState(DateTime
    // .now())` once at mount, so a page left open across the deadline keeps
    // reporting "hidden" forever. Passing a later `now` must flip the answer.
    const hideUntil = '2026-08-17T13:00:00.000Z';
    expect(isMetricsHidden(hideUntil, NOW)).toBe(true);
    expect(isMetricsHidden(hideUntil, NOW.plus({ hours: 2 }))).toBe(false);
  });
});

const stall = (overrides: Partial<IStall> = {}) => ({ name: 'Stall 4', ...overrides }) as IStall;

describe('deriveOverlay', () => {
  it('shows nothing while the stall is still being resolved', () => {
    expect(deriveOverlay({ stall: undefined, hasResolvedStall: false, now: NOW })).toBe('none');
  });

  it('prefers "unsupported" over "no stall" when the monitor itself is the problem', () => {
    const unsupported = stall({
      AppMetaData: { model_compatibility: { is_supported: false } } as never,
    });
    expect(deriveOverlay({ stall: unsupported, hasResolvedStall: true, now: NOW })).toBe(
      'unsupported',
    );
  });

  it('reports no-stall once resolution is done and there is none', () => {
    expect(deriveOverlay({ stall: undefined, hasResolvedStall: true, now: NOW })).toBe('no-stall');
  });

  it('reports metrics-hidden during the settling-in window, using a live clock', () => {
    const settling = stall({ hide_metrics_till: '2026-08-17T13:00:00.000Z' });
    expect(deriveOverlay({ stall: settling, hasResolvedStall: true, now: NOW })).toBe(
      'metrics-hidden',
    );
    expect(
      deriveOverlay({ stall: settling, hasResolvedStall: true, now: NOW.plus({ hours: 2 }) }),
    ).toBe('none');
  });

  it('is none for a normal, fully-resolved stall', () => {
    expect(deriveOverlay({ stall: stall(), hasResolvedStall: true, now: NOW })).toBe('none');
  });

  it('never claims "no stall" when the details request simply failed', () => {
    // The regression this replaces: `hasResolvedStall` was `isSuccess ||
    // isError`, so a failed fetch with a cached row rendered "No stall
    // monitor" as a statement of fact about a horse that may well have one.
    // An error is not an answer.
    expect(
      deriveOverlay({
        stall: undefined,
        hasResolvedStall: false,
        detailsFailed: true,
        now: NOW,
      }),
    ).toBe('details-unavailable');
  });

  it('prefers "unknown" over any stall-derived message when the fetch failed', () => {
    // Even if a stale stall object is still in hand, a failed refresh means we
    // cannot vouch for any of it.
    expect(
      deriveOverlay({
        stall: stall({ hide_metrics_till: '2026-08-17T13:00:00.000Z' }),
        hasResolvedStall: true,
        detailsFailed: true,
        now: NOW,
      }),
    ).toBe('details-unavailable');
  });
});
