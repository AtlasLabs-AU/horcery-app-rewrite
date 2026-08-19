import { DateTime } from 'luxon';

import {
  boutDescription,
  buildLyingDownWeek,
  comparisonDisagrees,
  comparisonSentence,
  inStallDisagrees,
  formatDuration,
  headline,
  type LyingDownComparison,
} from '@/charts/lying-down';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T18:00:00', { zone: ZONE });
const SELECTED = '2026-08-19';
const STEP = 60;

/** Build a binary 0/1 series, exactly the shape the approved query returns. */
function series(downRanges: [string, string][]): PrometheusRangeSeries[] {
  const values: [number, string][] = [];
  const first = DateTime.fromISO('2026-08-13T00:00:00', { zone: ZONE });
  const last = NOW;
  const ranges = downRanges.map(([from, to]) => [
    DateTime.fromISO(from, { zone: ZONE }).toSeconds(),
    DateTime.fromISO(to, { zone: ZONE }).toSeconds(),
  ]);
  for (let t = first.toSeconds(); t <= last.toSeconds(); t += STEP) {
    const down = ranges.some(([from, to]) => t >= from! && t < to!);
    values.push([t, down ? '1' : '0']);
  }
  return [{ metric: { animal_type: 'horse', id: '0' }, values }];
}

describe('buildLyingDownWeek', () => {
  it('groups today into separate bouts rather than one total', () => {
    const week = buildLyingDownWeek({
      result: series([
        ['2026-08-19T08:00:00', '2026-08-19T08:30:00'],
        ['2026-08-19T10:00:00', '2026-08-19T10:20:00'],
      ]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });

    expect(week.today?.bouts).toHaveLength(2);
    expect(week.today?.totalSeconds).toBe(50 * 60);
    expect(week.boutCount).toBe(2);
  });

  it('NEVER reports missing observations as zero lying down', () => {
    // Samples stop after the 16th — the monitor went offline, the horse did not
    // stop lying down. A zero here would read as a welfare alarm.
    const withGap = series([['2026-08-14T01:00:00', '2026-08-14T08:00:00']]);
    withGap[0]!.values = withGap[0]!.values.filter(
      ([t]) => t < DateTime.fromISO('2026-08-17T00:00:00', { zone: ZONE }).toSeconds(),
    );

    const week = buildLyingDownWeek({
      result: withGap,
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });

    const uncovered = week.days.filter((day) => day.coverage === 'no-observations');
    expect(uncovered.length).toBeGreaterThan(0);
    for (const day of uncovered) {
      expect(day.totalSeconds).toBeNull();
      expect(day.totalSeconds).not.toBe(0);
    }
    expect(week.state).toBe('partial');
  });

  it('distinguishes "observed, stayed up" from "no observations"', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });

    const quiet = week.days.find((day) => day.key === '2026-08-18');
    expect(quiet?.coverage).toBe('observed');
    expect(quiet?.totalSeconds).toBe(0); // known to have stayed up — a real zero
    expect(quiet?.bouts).toEqual([]);
  });

  it('reports out-of-stall separately from no data', () => {
    const week = buildLyingDownWeek({
      result: series([]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      outOfStall: true,
    });
    expect(week.state).toBe('out-of-stall');
  });

  it('reports no-data when the query returned no series at all', () => {
    const week = buildLyingDownWeek({
      result: [],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(week.state).toBe('no-data');
    expect(week.days.every((day) => day.totalSeconds === null)).toBe(true);
  });

  it('clamps the day in progress to now and never claims the future', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(week.today?.end).toBeLessThanOrEqual(NOW.toSeconds());
  });

  it('holds the real production volume without difficulty', () => {
    // Measured 2026-08-19 on sm-1275/1272/1212: 16–31 bouts across seven days.
    const week = buildLyingDownWeek({
      result: series(
        Array.from({ length: 28 }, (_, i) => {
          const day = 13 + Math.floor(i / 4);
          const hour = 1 + (i % 4) * 5;
          return [
            `2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`,
            `2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:30:00`,
          ] as [string, string];
        }),
      ),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(week.boutCount).toBeGreaterThan(20);
    expect(week.boutCount).toBeLessThan(40);
  });
});

describe('presentation helpers', () => {
  it('formats durations the way a person says them', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(2 * 3600)).toBe('2 h');
    expect(formatDuration(2 * 3600 + 15 * 60)).toBe('2 h 15 min');
  });

  it('returns no headline rather than a false zero when data is missing', () => {
    const week = buildLyingDownWeek({
      result: [],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(headline(week)).toBeNull();
  });

  it('states the comparison without judging it good or bad', () => {
    const comparison: LyingDownComparison = {
      typicalByNowSeconds: 60 * 60,
      verdict: 'more-than-usual',
      basisDays: 28,
    };
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T09:25:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      comparison,
    });

    const sentence = comparisonSentence(week)!;
    expect(sentence).toBe('25 min more than usual by this time');
    expect(sentence).not.toMatch(/good|bad|healthy|concern|worry|normal behaviour/i);
  });

  it('takes direction from the verdict, not from its own subtraction', () => {
    // Today 30 min, typical 60 min. Arithmetic says "less"; upstream says
    // "less" too — they agree, so the sentence renders.
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      comparison: { typicalByNowSeconds: 60 * 60, verdict: 'less-than-usual', basisDays: 28 },
    });
    expect(comparisonSentence(week)).toBe('30 min less than usual by this time');
  });

  it('refuses to assert a direction when the verdict contradicts the numbers', () => {
    // Today 30 min against a typical of 60 min is LESS, but upstream claims
    // MORE. The card must not print a direction either source disowns.
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      comparison: { typicalByNowSeconds: 60 * 60, verdict: 'more-than-usual', basisDays: 28 },
    });
    expect(comparisonDisagrees(week)).toBe(true);
    expect(comparisonSentence(week)).toBeNull();
    // The headline is unaffected — we still know how long the horse was down.
    expect(headline(week)).toBe('30 min lying down today');
  });

  it('tolerates sub-minute rounding between backend and chart', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      comparison: {
        typicalByNowSeconds: 30 * 60 + 30,
        verdict: 'more-than-usual',
        basisDays: 28,
      },
    });
    expect(comparisonDisagrees(week)).toBe(false);
  });

  it('says so plainly when there is not enough history', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      comparison: { typicalByNowSeconds: 0, verdict: 'insufficient-history', basisDays: 3 },
    });
    expect(comparisonSentence(week)).toContain('Not enough history yet');
  });

  it('describes a bout for a screen reader', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T08:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(boutDescription(week.today!.bouts[0]!, ZONE)).toMatch(
      /^Lying down, 8:00 AM to 8:\d\d AM, \d+ min$/,
    );
  });
});

describe('barn day, time in stall, and the cumulative line', () => {
  it('keeps a night whole instead of splitting it across two rows', () => {
    // A single rest from 11 PM to 1 AM. Under a midnight day it is two half
    // rests on two days; under the 6 AM barn day it is one rest on one day.
    const overnight = series([['2026-08-18T23:00:00', '2026-08-19T01:00:00']]);

    const midnight = buildLyingDownWeek({
      result: overnight, selectedDate: SELECTED, zone: ZONE, now: NOW, dayStartHour: 0,
    });
    const barn = buildLyingDownWeek({
      result: overnight, selectedDate: SELECTED, zone: ZONE, now: NOW, dayStartHour: 6,
    });

    const split = midnight.days.filter((d) => (d.totalSeconds ?? 0) > 0);
    const whole = barn.days.filter((d) => (d.totalSeconds ?? 0) > 0);

    expect(split).toHaveLength(2);           // 1 h on the 18th, 1 h on the 19th
    expect(whole).toHaveLength(1);           // 2 h on one barn day
    expect(whole[0]!.totalSeconds).toBe(2 * 3600);
  });

  it('defaults to the 6 AM barn day the approved queries use', () => {
    const week = buildLyingDownWeek({
      result: series([]), selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(week.dayStartHour).toBe(6);
  });

  it('carries time in stall as the denominator, and null when unknown', () => {
    const lying = series([['2026-08-19T07:00:00', '2026-08-19T08:00:00']]);
    const inStall = series([['2026-08-19T06:30:00', '2026-08-19T10:30:00']]);

    const withStall = buildLyingDownWeek({
      result: lying, inStallResult: inStall, selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(withStall.today?.inStallSeconds).toBe(4 * 3600);
    expect(withStall.today?.inStallIntervals).toHaveLength(1);

    // No in-stall query supplied: unknown, NOT zero. A zero denominator would
    // make every horse look permanently absent.
    const without = buildLyingDownWeek({
      result: lying, selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(without.today?.inStallSeconds).toBeNull();
  });

  it('builds a cumulative line that only ever rises', () => {
    const week = buildLyingDownWeek({
      result: series([
        ['2026-08-19T07:00:00', '2026-08-19T07:30:00'],
        ['2026-08-19T09:00:00', '2026-08-19T09:20:00'],
      ]),
      selectedDate: SELECTED, zone: ZONE, now: NOW,
    });

    const totals = week.cumulative.map((p) => p.totalSeconds);
    expect(totals.length).toBeGreaterThan(2);
    expect(totals[0]).toBe(0);
    expect(totals.at(-1)).toBe(50 * 60);
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i]!).toBeGreaterThanOrEqual(totals[i - 1]!);
    }
  });

  it('has no cumulative line when today has no observations', () => {
    const week = buildLyingDownWeek({
      result: [], selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(week.cumulative).toEqual([]);
  });
});

describe('an impossible denominator', () => {
  it('detects lying-down time exceeding in-stall time', () => {
    // The horse can only be seen lying down while it is in the stall.
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T11:00:00']]),   // 3 h down
      inStallResult: series([['2026-08-19T08:00:00', '2026-08-19T09:00:00']]), // 1 h in
      selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(inStallDisagrees(week.today!)).toBe(true);
  });

  it('accepts a consistent day, and tolerates a minute of query skew', () => {
    const consistent = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T09:00:00']]),
      inStallResult: series([['2026-08-19T07:00:00', '2026-08-19T12:00:00']]),
      selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(inStallDisagrees(consistent.today!)).toBe(false);
  });

  it('is not triggered when in-stall time is simply unknown', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-19T08:00:00', '2026-08-19T09:00:00']]),
      selectedDate: SELECTED, zone: ZONE, now: NOW,
    });
    expect(week.today!.inStallSeconds).toBeNull();
    expect(inStallDisagrees(week.today!)).toBe(false);
  });
});
