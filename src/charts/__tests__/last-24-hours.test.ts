import { DateTime } from 'luxon';

import { buildLast24Hours, WINDOW_SECONDS } from '@/charts/last-24-hours';
import {
  brokenNight,
  noData,
  ordinaryDay,
  overflowDay,
  withRem,
} from '@/charts/fixtures/last-24-hours';

const ZONE = 'America/Chicago';
const ENDS = DateTime.fromISO('2026-08-21T14:30:00', { zone: ZONE });

const build = (segments: Parameters<typeof buildLast24Hours>[0]['segments']) =>
  buildLast24Hours({ endsAt: ENDS, zone: ZONE, segments });

describe('buildLast24Hours', () => {
  it('accounts for every second of the window, exactly once', () => {
    const day = build(ordinaryDay);
    const total =
      day.segments.reduce((sum, segment) => sum + segment.seconds, 0) + day.unknownSeconds;
    expect(total).toBe(WINDOW_SECONDS);
    // Shares are the same statement as fractions.
    const shares = day.segments.reduce((sum, segment) => sum + segment.share, 0);
    expect(shares + day.unknownSeconds / WINDOW_SECONDS).toBeCloseTo(1, 10);
  });

  it('calls the remainder unknown rather than inventing a behaviour for it', () => {
    // The shipping app turns missing resting data into "Awake". The remainder
    // here is unattributed time, and it stays that way.
    const day = build(brokenNight);
    expect(day.unknownSeconds).toBe(WINDOW_SECONDS - (7 * 3600 + 5 * 60) - (11 * 3600 + 40 * 60) - (2 * 3600 + 33 * 60));
    expect(day.segments.map((segment) => segment.id)).not.toContain('unknown');
  });

  it('refuses to draw a 25-hour day instead of squeezing it to fit', () => {
    // 2 + 20 + 3 = 25 hours — the exact contradiction measured on SM-1272 in
    // the shipping app. Normalising it would hide an upstream error.
    const day = build(overflowDay);
    expect(day.state).toBe('unavailable');
    expect(day.segments).toEqual([]);
  });

  it('refuses a negative duration for the same reason', () => {
    expect(
      build([{ id: 'resting', label: 'Resting', seconds: -60 }]).state,
    ).toBe('unavailable');
  });

  it('reports no data when no category could be produced', () => {
    expect(build(noData).state).toBe('no-data');
  });

  it('takes a fifth category without special handling', () => {
    // REM is already decided (requirements meeting, 2026-07-23); a new
    // category must be an addition, not a redesign.
    const day = build(withRem);
    expect(day.state).toBe('ready');
    expect(day.segments).toHaveLength(4);
  });

  it('names the window ending, so a past day cannot pass as today', () => {
    expect(build(ordinaryDay).windowLabel).toBe('24 hours ending 2:30 PM');
  });

  it('tolerates rounding slack without ever letting shares exceed one', () => {
    const day = build([
      { id: 'resting', label: 'Resting', seconds: 12 * 3600 + 30 },
      { id: 'in-stall-awake', label: 'In stall, awake', seconds: 12 * 3600 + 20 },
    ]);
    expect(day.state).toBe('ready');
    const shares = day.segments.reduce((sum, segment) => sum + segment.share, 0);
    expect(shares).toBeLessThanOrEqual(1);
    expect(day.unknownSeconds).toBe(0);
  });
});
