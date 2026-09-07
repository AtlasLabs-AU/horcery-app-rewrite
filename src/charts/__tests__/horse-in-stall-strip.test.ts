import { DateTime } from 'luxon';

import { monitorGapMidday, routineTurnout } from '@/charts/fixtures/horse-in-stall-behavior';
import { buildHorseInStallStrip } from '@/charts/horse-in-stall-strip';
import { observationGaps } from '@/charts/observation-gaps';

const ZONE = 'America/Chicago';
const HOUR = 3600;
/** An hour before the 06:00 rollover, so the day on screen is complete. */
const NOW = DateTime.fromISO('2026-08-20T05:00:00', { zone: ZONE });
const SELECTED = NOW.minus({ hours: 6 }).toFormat('yyyy-MM-dd');

function strip(result = routineTurnout(NOW)) {
  return buildHorseInStallStrip({
    result,
    selectedDate: SELECTED,
    zone: ZONE,
    dayStartHour: 6,
    now: NOW,
    usualSecondsByWeekday: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, 19 * HOUR])),
    entityCreatedAt: NOW.minus({ months: 6 }).toISO(),
  });
}

describe('buildHorseInStallStrip', () => {
  it('gives seven barn days with today first', () => {
    const { rows } = strip();
    expect(rows).toHaveLength(7);
    expect(rows[0]?.isToday).toBe(true);
    expect(rows[0]?.label).toBe('Today');
    expect(rows.slice(1).every((row) => !row.isToday)).toBe(true);
    // Short weekdays, not one-letter initials: "T" twice and "S" twice is not
    // a row identity.
    expect(rows.slice(1).map((row) => row.label)).toEqual(['Tue', 'Mon', 'Sun', 'Sat', 'Fri', 'Thu']);
    // Reading downward goes into the past.
    expect(rows[1]!.start).toBeGreaterThan(rows[2]!.start);
  });

  it('clamps the day in progress to now, and no other day', () => {
    const { rows } = strip();
    expect(rows[0]!.upTo).toBe(NOW.toSeconds());
    expect(rows[0]!.upTo).toBeLessThan(rows[0]!.nextMidnight);
    for (const row of rows.slice(1)) expect(row.upTo).toBe(row.nextMidnight);
  });

  it('draws routine turnout as an in-stall run on either side of a gap', () => {
    const { rows } = strip();
    const yesterday = rows[1]!;
    expect(yesterday.coverage).toBe('observed');
    expect(yesterday.inStall.length).toBeGreaterThanOrEqual(2);
    expect(yesterday.unobserved).toEqual([]);
    expect(yesterday.totalSeconds).toBeGreaterThan(17 * HOUR);
  });

  /**
   * The two states this chart exists to keep apart. A silent day and a horse
   * that stayed out look identical on any chart with two colours.
   */
  it('marks a silent day as one unobserved run end to end, never as "out"', () => {
    const { rows } = strip(monitorGapMidday(NOW));
    const silent = rows.filter((row) => row.coverage === 'no-observations');
    expect(silent).toHaveLength(2);
    for (const row of silent) {
      expect(row.totalSeconds).toBeNull();
      expect(row.inStall).toEqual([]);
      expect(row.unobserved).toEqual([{ enter: row.start, exit: row.upTo }]);
    }
  });

  it('marks a mid-day outage as a gap inside an otherwise observed day', () => {
    const { rows } = strip(monitorGapMidday(NOW));
    const today = rows[0]!;
    expect(today.coverage).toBe('partial');
    expect(today.unobserved).toHaveLength(1);
    const [gap] = today.unobserved;
    expect(gap!.exit - gap!.enter).toBeGreaterThan(3 * HOUR);
    expect(gap!.exit - gap!.enter).toBeLessThan(5 * HOUR);
  });

  it('carries the weekly verdict and figures for the header', () => {
    const { summary } = strip();
    // Routine turnout is ~19 h in against a stated 19 h normal: Usual, not
    // merely "some verdict".
    expect(summary.dailyAverageSeconds).toBeGreaterThan(18 * HOUR);
    expect(summary.verdict).toBe('usual');
  });

  it('does not judge a week with silent days in it', () => {
    const { summary } = strip(monitorGapMidday(NOW));
    expect(summary.verdict).toBe('incomplete');
  });
});

describe('observationGaps', () => {
  const from = NOW.minus({ hours: 12 }).toSeconds();
  const to = NOW.toSeconds();
  const series = (stamps: number[]) => [
    { metric: {}, values: stamps.map((at) => [at, '1'] as [number, string]) },
  ];

  it('is the whole window when nothing was reported', () => {
    expect(observationGaps([], from, to)).toEqual([{ enter: from, exit: to }]);
  });

  it('ignores a single dropped scrape', () => {
    const stamps: number[] = [];
    for (let t = from; t <= to; t += 60) if (t !== from + 3600) stamps.push(t);
    expect(observationGaps(series(stamps), from, to)).toEqual([]);
  });

  it('reports a real hole with its true edges', () => {
    const stamps: number[] = [];
    const holeFrom = from + 2 * HOUR;
    const holeTo = from + 6 * HOUR;
    for (let t = from; t <= to; t += 60) if (t < holeFrom || t > holeTo) stamps.push(t);
    const [gap] = observationGaps(series(stamps), from, to);
    expect(gap!.enter).toBeLessThanOrEqual(holeFrom);
    expect(gap!.exit).toBeGreaterThanOrEqual(holeTo);
    expect(gap!.exit - gap!.enter).toBeLessThan(4 * HOUR + 180);
  });

  it('is empty for an empty or inverted window', () => {
    expect(observationGaps([], to, from)).toEqual([]);
    expect(observationGaps([], from, from)).toEqual([]);
  });

  it('measures the cadence from the data rather than assuming one', () => {
    // 90 s readings: the limit is 4 × 90 = 360 s. Dropping three consecutive
    // readings leaves a 360 s gap — at the limit, not over it — so nothing is
    // reported; dropping four leaves 450 s and must be.
    const dropping = (count: number) => {
      const stamps: number[] = [];
      let dropped = 0;
      for (let t = from; t <= to; t += 90) {
        if (t >= from + HOUR && dropped < count) {
          dropped++;
          continue;
        }
        stamps.push(t);
      }
      return observationGaps(series(stamps), from, to);
    };
    expect(dropping(3)).toEqual([]);
    expect(dropping(4)).toHaveLength(1);
  });

  it('treats corrupt samples as absence, not coverage', () => {
    const values: [number, string][] = [];
    for (let t = from; t <= to; t += 60) {
      values.push([t, t > from + 2 * HOUR && t < from + 6 * HOUR ? 'NaN' : '1']);
    }
    const gaps = observationGaps([{ metric: {}, values }], from, to);
    expect(gaps).toHaveLength(1);
  });
});
