import { DateTime } from 'luxon';

import {
  buildLyingDownTimeline,
  observedRestSeconds,
  unobservedWithin,
} from '@/charts/lying-down-timeline';
import {
  noData,
  normalNight,
  observedNeverDown,
  outageBetweenRests,
  samples,
  singleSampleAnd235830,
  stopsWhileDown,
  twoTracksOneHorse,
  twoTracksOverlapping,
} from '@/charts/fixtures/lying-down-timeline';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-21T12:00:00', { zone: ZONE });
const at = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toSeconds();

const build = (
  result: ReturnType<typeof normalNight>,
  overrides: Partial<Parameters<typeof buildLyingDownTimeline>[0]> = {},
) =>
  buildLyingDownTimeline({
    result,
    selectedDate: '2026-08-21',
    zone: ZONE,
    now: NOW,
    ...overrides,
  });

const day = (t: ReturnType<typeof build>, key: string) => t.days.find((d) => d.key === key)!;

/**
 * The brief's acceptance cases (§4), numbered to match. Every expected value
 * below was written down from the fixture BEFORE running the code, so the
 * tests check the contract rather than describe whatever the code does.
 */
describe('Lying Down timeline — brief §4 acceptance', () => {
  it('1. a normal rest bout has the duration its samples support', () => {
    const d = day(build(normalNight(ZONE)), '2026-08-20');
    expect(d.bouts).toHaveLength(2);
    // Samples are 1 from 01:52:00 up to (not including) 03:10:00. The last
    // positive sample is 03:09:30; the bout closes at the first 0 at 03:10:00.
    expect(d.bouts[0]!.enter).toBe(at('2026-08-20T01:52:00'));
    expect(d.bouts[0]!.exit).toBe(at('2026-08-20T03:10:00'));
    expect(observedRestSeconds(d)).toBe(78 * 60 + 35 * 60);
    expect(d.unobserved).toEqual([]);
  });

  it('2. an outage between positives gives two bouts and an unknown between', () => {
    const d = day(build(outageBetweenRests(ZONE)), '2026-08-20');
    // Down 01:00–06:00 but silent 02:00–05:00: rest is only SUPPORTED 01:00–02:00
    // and 05:00–06:00. The legacy chart bridged the silence as five hours down.
    expect(d.bouts).toHaveLength(2);
    expect(d.bouts[0]!.exit).toBe(at('2026-08-20T01:59:30'));
    expect(d.bouts[1]!.enter).toBe(at('2026-08-20T05:00:00'));
    expect(d.unobserved).toEqual([{ from: at('2026-08-20T01:59:30'), to: at('2026-08-20T05:00:00') }]);
    expect(observedRestSeconds(d)).toBeLessThanOrEqual(2 * 3600);
  });

  it('3. recording that stops while down is not extended to now or midnight', () => {
    const d = day(build(stopsWhileDown(ZONE)), '2026-08-20');
    // Last sample 02:30:00, still down. The bout ends there — not at 09:00,
    // not at midnight, not at now.
    expect(d.bouts).toHaveLength(1);
    expect(d.bouts[0]!.exit).toBe(at('2026-08-20T02:30:00'));
    expect(d.unobserved.at(-1)).toEqual({ from: at('2026-08-20T02:30:00'), to: d.nextMidnight });
  });

  it('4. a single sample and a 23:58:30 ending manufacture no duration', () => {
    const d = day(build(singleSampleAnd235830(ZONE)), '2026-08-20');
    const single = d.bouts.find((b) => b.enter === at('2026-08-20T14:00:00'))!;
    // One positive sample at 14:00:00; next sample (0) at 14:00:30. The bout
    // is that one step — 30 s — and a renderer may widen it for visibility,
    // but the DATA does not.
    expect(single.exit - single.enter).toBe(30);
    const late = d.bouts.find((b) => b.enter === at('2026-08-20T23:20:00'))!;
    // Legacy added 89 s to any bout ending 23:58:30 to reach 23:59:59.
    expect(late.exit).toBe(at('2026-08-20T23:58:30'));
    expect(late.exit).not.toBe(at('2026-08-20T23:59:59'));
  });

  it('5. two tracks of one horse keep every bout; overlapping tracks count once', () => {
    const separate = day(build(twoTracksOneHorse(ZONE)), '2026-08-20');
    expect(separate.bouts).toHaveLength(2);
    expect(observedRestSeconds(separate)).toBe(2 * 3600);

    const overlapping = day(build(twoTracksOverlapping(ZONE)), '2026-08-20');
    // The legacy app summed them: two hours. It was one hour.
    expect(observedRestSeconds(overlapping)).toBe(3600);
  });

  it('6. readings before the assignment are not this horse\'s, and read as unknown', () => {
    const assignedAt = at('2026-08-19T12:10:00');
    const t = build(
      [samples(ZONE, '2026-08-15T00:00:00', '2026-08-21T12:00:00', [
        ['2026-08-19T01:00:00', '2026-08-19T02:00:00'], // previous occupant
        ['2026-08-19T21:00:00', '2026-08-19T22:00:00'], // this horse
      ])],
      { assignedAt },
    );
    const tue = day(t, '2026-08-19');
    expect(tue.bouts).toHaveLength(1);
    expect(tue.bouts[0]!.enter).toBe(at('2026-08-19T21:00:00'));
    expect(tue.unobserved[0]).toEqual({ from: tue.start, to: assignedAt });
    // Every earlier day is wholly unknown — one stretch each, no bars.
    for (const key of ['2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18']) {
      expect(day(t, key).bouts).toEqual([]);
      expect(day(t, key).unobserved).toEqual([{ from: day(t, key).start, to: day(t, key).nextMidnight }]);
    }
  });

  it('7. a rest across midnight is split, not lost or doubled, through DST', () => {
    // Spring forward 2026-03-08 02:00 in Chicago: the day is 23 hours long.
    const now = DateTime.fromISO('2026-03-09T12:00:00', { zone: ZONE });
    const t = buildLyingDownTimeline({
      result: [samples(ZONE, '2026-03-07T00:00:00', '2026-03-09T12:00:00', [
        ['2026-03-07T23:00:00', '2026-03-08T04:00:00'],
      ])],
      selectedDate: '2026-03-09',
      zone: ZONE,
      now,
    });
    const sat = day(t, '2026-03-07');
    const sun = day(t, '2026-03-08');
    expect(sat.bouts.at(-1)!.exit).toBe(sat.nextMidnight);
    expect(sun.bouts[0]!.enter).toBe(sun.start);
    // 23:00 → 04:00 across a spring-forward is FOUR elapsed hours, not five.
    expect(observedRestSeconds(sat) + observedRestSeconds(sun)).toBe(4 * 3600);
    expect(sun.nextMidnight - sun.start).toBe(23 * 3600);
  });

  it('8. an empty response is no data; a watched horse that never lay down is zero', () => {
    expect(build(noData()).state).toBe('no-data');
    const d = day(build(observedNeverDown(ZONE)), '2026-08-20');
    expect(d.bouts).toEqual([]);
    expect(d.unobserved).toEqual([]); // observed all day — a real zero
    expect(observedRestSeconds(d)).toBe(0);
  });
});

describe('unobservedWithin', () => {
  it('treats a day with no samples as one unknown stretch', () => {
    expect(unobservedWithin([], 0, 100, 10)).toEqual([{ from: 0, to: 100 }]);
  });

  it('marks leading, middle and trailing silences', () => {
    expect(unobservedWithin([50, 60, 200, 210], 0, 300, 20)).toEqual([
      { from: 0, to: 50 },
      { from: 60, to: 200 },
      { from: 210, to: 300 },
    ]);
  });
});
