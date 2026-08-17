import { DateTime } from 'luxon';

import { cursorFor, liveSliceFor, LIVE_SLICE_SECONDS } from '@/hooks/playhead-data';

/**
 * The guard for the worst bug in slice 2's first cut.
 *
 * `useOrganizationNow` ticks every minute and the play-head cursor follows it.
 * The status hook put that cursor straight into three Prometheus query keys,
 * so React Query saw brand-new queries every 60 seconds and refetched
 * immediately — ~180 requests an hour instead of ~18, with the
 * `refetchInterval` meant to pace them never surviving long enough to fire.
 *
 * `liveSliceFor` is the fix, and this exercises the real function rather than
 * a copy of its arithmetic. The property it must hold: **a minute of real time
 * must not change the key.**
 */
const at = (iso: string) => DateTime.fromISO(iso, { zone: 'Australia/Sydney' });

describe('live reading slice', () => {
  it('does not change as the clock ticks minute by minute', () => {
    const base = at('2026-08-17T14:31:00.000');
    const day = base.startOf('day');

    // Five consecutive minutes inside one slice must all key identically.
    const keys = new Set(
      [0, 1, 2, 3].map((minutes) => liveSliceFor(cursorFor(day, base.plus({ minutes })))),
    );

    expect(keys.size).toBe(1);
  });

  it('advances exactly once per slice, which is what refreshes the reading', () => {
    const day = at('2026-08-17T00:00:00.000');
    const early = liveSliceFor(cursorFor(day, at('2026-08-17T14:31:00.000')));
    const later = liveSliceFor(cursorFor(day, at('2026-08-17T14:37:00.000')));

    expect(later).toBeGreaterThan(early);
    expect(later - early).toBe(LIVE_SLICE_SECONDS);
  });

  it('is stable for a past day regardless of the current minute', () => {
    // A past day's cursor is its end of day, so it must not move at all.
    const day = at('2026-08-14T00:00:00.000');
    const a = liveSliceFor(cursorFor(day, at('2026-08-17T14:31:00.000')));
    const b = liveSliceFor(cursorFor(day, at('2026-08-17T22:07:00.000')));

    expect(a).toBe(b);
  });
});
