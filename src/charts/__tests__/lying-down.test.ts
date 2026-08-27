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
  dayStartHourFrom,
  DEFAULT_DAY_START_HOUR,
  lyingDownVerdict,
  DEFAULT_DEVIATION_THRESHOLD_PERCENT,
  buildLyingDownWeekly,
  hasEnoughHistory,
  usualByNow,
  elapsedFractionOfDay,
  usualWindowObserved,
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

  it('records freshness from the newest real sample and ignores future timestamps', () => {
    const result = series([]);
    result[0]!.values.push([NOW.plus({ hours: 2 }).toSeconds(), '0']);
    const week = buildLyingDownWeek({
      result,
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });

    expect(week.asOf).toBe(NOW.toSeconds());
    expect(week.lastObservedAt).toBe(NOW.toSeconds());
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

/**
 * The barn day belongs to the organization, not to us (Inakshi, 2026-08-19).
 * `chart_start_time` is a customer-settable wall-clock string, and 6 AM is only
 * the fallback — the same one the shipping app uses.
 */
describe('dayStartHourFrom', () => {
  it('reads a whole hour from the organization', () => {
    expect(dayStartHourFrom('06:00:00')).toBe(6);
    expect(dayStartHourFrom('00:00:00')).toBe(0);
    expect(dayStartHourFrom('23:00')).toBe(23);
  });

  it('keeps minutes rather than rounding a real setting away', () => {
    expect(dayStartHourFrom('05:30:00')).toBe(5.5);
    expect(dayStartHourFrom('05:45')).toBe(5.75);
  });

  it('falls back to 6 rather than failing the chart', () => {
    // Unset is the common case: most organizations never touch the setting.
    expect(dayStartHourFrom(null)).toBe(DEFAULT_DAY_START_HOUR);
    expect(dayStartHourFrom(undefined)).toBe(DEFAULT_DAY_START_HOUR);
    expect(dayStartHourFrom('')).toBe(DEFAULT_DAY_START_HOUR);
    // And so is nonsense, which must not throw on a customer's home screen.
    expect(dayStartHourFrom('not a time')).toBe(DEFAULT_DAY_START_HOUR);
    expect(dayStartHourFrom('25:00:00')).toBe(DEFAULT_DAY_START_HOUR);
    expect(dayStartHourFrom('06:75:00')).toBe(DEFAULT_DAY_START_HOUR);
  });
});

/**
 * Data Science decides WHETHER today is unusual; we decide WHICH WAY.
 *
 * Their `lyingDownDeviationPercentage` query carries the tuned 25% threshold but
 * wraps the result in `abs()`, so it cannot separate a horse resting far less
 * than usual from one resting far more. Those are clinically opposite — less
 * suggests pain, more suggests illness — so the direction is taken from the two
 * figures the row already displays.
 */
describe('lyingDownVerdict', () => {
  const HOUR = 3600;

  it('is usual while inside the threshold, however the day sits', () => {
    expect(
      lyingDownVerdict({ deviationPercent: 12, valueSeconds: HOUR, usualSeconds: 2 * HOUR }),
    ).toBe('usual');
    // Exactly on the threshold is still usual — the query says "more than".
    expect(
      lyingDownVerdict({ deviationPercent: 25, valueSeconds: HOUR, usualSeconds: 2 * HOUR }),
    ).toBe('usual');
  });

  it('reads direction from today against this horse own normal', () => {
    expect(
      lyingDownVerdict({ deviationPercent: 80, valueSeconds: 0.3 * HOUR, usualSeconds: 2 * HOUR }),
    ).toBe('low');
    expect(
      lyingDownVerdict({ deviationPercent: 80, valueSeconds: 4 * HOUR, usualSeconds: 2 * HOUR }),
    ).toBe('high');
  });

  it('respects a threshold supplied by Data Science over our fallback', () => {
    expect(
      lyingDownVerdict({
        deviationPercent: 40,
        thresholdPercent: 50,
        valueSeconds: HOUR,
        usualSeconds: 2 * HOUR,
      }),
    ).toBe('usual');
    expect(DEFAULT_DEVIATION_THRESHOLD_PERCENT).toBe(25);
  });

  it('says unusual rather than guessing when the two sources disagree', () => {
    // Their query calls it unusual; our figures are identical. Assert less.
    expect(
      lyingDownVerdict({ deviationPercent: 60, valueSeconds: 2 * HOUR, usualSeconds: 2 * HOUR }),
    ).toBe('unusual');
  });

  it('never reads missing data as a verdict', () => {
    // No observations at all is an absence, not a normal day.
    expect(
      lyingDownVerdict({ deviationPercent: 5, valueSeconds: null, usualSeconds: 2 * HOUR }),
    ).toBe('no-data');
    // The query returned nothing — which must not be treated as zero deviation.
    expect(
      lyingDownVerdict({ deviationPercent: null, valueSeconds: HOUR, usualSeconds: 2 * HOUR }),
    ).toBe('unknown');
    // No history for this horse yet, so there is no "normal" to compare against.
    expect(
      lyingDownVerdict({ deviationPercent: 90, valueSeconds: HOUR, usualSeconds: null }),
    ).toBe('unknown');
  });
});

/**
 * The weekly view. Its two rules, both decided 2026-08-19:
 * the badge reports the WEEK (so badge and chart describe the same span), and
 * today is never judged, because its bar is incomplete by definition.
 */
describe('buildLyingDownWeekly', () => {
  const HOUR = 3600;
  const flatUsual = (seconds: number) =>
    Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, seconds]));

  /** A week with one rest a day, so every completed day is observed and equal. */
  const steadyWeek = () =>
    series(
      Array.from({ length: 7 }, (_, i) => {
        const day = DateTime.fromISO('2026-08-13T01:00:00', { zone: ZONE }).plus({ days: i });
        return [day.toISO()!, day.plus({ minutes: 60 }).toISO()!] as [string, string];
      }),
    );

  const build = (result: PrometheusRangeSeries[]) =>
    buildLyingDownWeek({ result, selectedDate: SELECTED, zone: ZONE, now: NOW });

  function weekly(result: PrometheusRangeSeries[], usualSeconds: number) {
    return buildLyingDownWeekly(build(result), {
      usualSecondsByWeekday: flatUsual(usualSeconds),
    });
  }

  it('gives one bar per day, today last', () => {
    const summary = weekly(steadyWeek(), 1.5 * HOUR);
    expect(summary.days).toHaveLength(7);
    expect(summary.days.at(-1)?.isToday).toBe(true);
    expect(summary.days.filter((day) => day.isToday)).toHaveLength(1);
  });

  it('preserves data health for the weekly renderer', () => {
    const source = build(steadyWeek());
    const summary = buildLyingDownWeekly({ ...source, state: 'stale' });
    expect(summary.state).toBe('stale');
    expect(summary.asOf).toBe(source.asOf);
    expect(summary.lastObservedAt).toBe(source.lastObservedAt);
  });

  it('never judges today, however its part-day total looks', () => {
    // Today is hours old and will always look low against a full day. Calling
    // it "Low" would fire every morning and mean nothing.
    const summary = weekly(steadyWeek(), 10 * HOUR);
    expect(summary.days.at(-1)?.verdict).toBe('unknown');
    // ...while the completed days ARE judged against the same normal.
    expect(summary.days.at(0)?.verdict).toBe('low');
  });

  it('excludes today from the week average, so mornings do not drag it down', () => {
    const summary = weekly(steadyWeek(), 1.5 * HOUR);
    const complete = summary.days.filter((day) => !day.isToday && day.totalSeconds !== null);
    const expected =
      complete.reduce((sum, day) => sum + (day.totalSeconds as number), 0) / complete.length;
    expect(summary.dailyAverageSeconds).toBeCloseTo(expected, 5);
    expect(summary.observedDays).toBe(complete.length);
  });

  it('badges the week, not today', () => {
    // A horse resting far less than its normal all week reads Low...
    expect(weekly(steadyWeek(), 10 * HOUR).verdict).toBe('low');
    // ...and one at its normal reads Usual, whatever today happens to be doing.
    const summary = weekly(steadyWeek(), 1 * HOUR);
    expect(['usual', 'high']).toContain(summary.verdict);
  });

  it('keeps an unobserved day null, so it can be drawn as absent not zero', () => {
    // The monitor was installed mid-window, so the earlier days carry no
    // samples at all — a true absence, not a run of zeros.
    const values: [number, string][] = [];
    const from = DateTime.fromISO('2026-08-17T00:00:00', { zone: ZONE });
    for (let t = from.toSeconds(); t <= NOW.toSeconds(); t += STEP) values.push([t, '0']);
    const summary = buildLyingDownWeekly(
      buildLyingDownWeek({
        result: [{ metric: { animal_type: 'horse', id: '0' }, values }],
        selectedDate: SELECTED,
        zone: ZONE,
        now: NOW,
      }),
      { usualSecondsByWeekday: flatUsual(1.5 * HOUR) },
    );
    const missing = summary.days.filter((day) => day.totalSeconds === null);
    expect(missing.length).toBeGreaterThan(0);
    // An absence is not a deviation, and must never be coloured as one.
    for (const day of missing) expect(day.verdict).toBe('no-data');
    expect(summary.observedDays).toBeLessThan(6);
  });

  it('says it has no verdict rather than inventing one without history', () => {
    const summary = buildLyingDownWeekly(build(steadyWeek()));
    expect(summary.usualDailyAverageSeconds).toBeNull();
    expect(summary.verdict).toBe('unknown');
    for (const day of summary.days) expect(day.usualSeconds).toBeNull();
  });
});

/**
 * "Enough to judge?" — the two gates on the verdict (Inakshi, 2026-08-19).
 *
 * Ported from the shipping app's `shouldShowAverageLine`, which uses the same
 * seven-day and four-week windows but only hides the average LINE. Its verdict
 * still shows, and when its deviation cannot be computed it falls back to
 * "usual" — so a stall installed yesterday reports every horse normal on no
 * evidence. Here the windows gate the claim itself.
 */
describe('hasEnoughHistory', () => {
  it('needs a week for the daily view and four weeks for the weekly one', () => {
    expect(hasEnoughHistory(NOW.minus({ days: 8 }).toISO(), 'daily', NOW)).toBe(true);
    expect(hasEnoughHistory(NOW.minus({ days: 6 }).toISO(), 'daily', NOW)).toBe(false);
    expect(hasEnoughHistory(NOW.minus({ weeks: 5 }).toISO(), 'weekly', NOW)).toBe(true);
    // Old enough to judge a day, still too new to judge a week.
    expect(hasEnoughHistory(NOW.minus({ days: 8 }).toISO(), 'weekly', NOW)).toBe(false);
  });

  it('fails closed on a date it cannot read', () => {
    // We do not judge a horse we cannot date.
    expect(hasEnoughHistory(null, 'daily', NOW)).toBe(false);
    expect(hasEnoughHistory(undefined, 'daily', NOW)).toBe(false);
    expect(hasEnoughHistory('not a date', 'daily', NOW)).toBe(false);
  });
});

/**
 * Compare like with like. Judging today's part-day total against the horse's
 * WHOLE-day normal badges every horse "Low" all morning — that is a clock, not a
 * welfare signal.
 */
describe('usualByNow', () => {
  const curve = [
    { fractionOfDay: 0, lowSeconds: 0, highSeconds: 0 },
    { fractionOfDay: 1, lowSeconds: 3600, highSeconds: 3600 },
  ];

  it('returns the normal for how much of the day has actually passed', () => {
    // NOW is 18:00 and the barn day starts at 06:00, so exactly half has passed.
    const built = buildLyingDownWeek({
      result: series([['2026-08-19T01:00:00', '2026-08-19T01:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(elapsedFractionOfDay(built)).toBeCloseTo(0.5, 2);
    expect(usualByNow(built, curve)).toBeCloseTo(1800, 0);
    // ...which is well under the whole-day 3600 the old comparison used.
    expect(usualByNow(built, curve)!).toBeLessThan(3600);
  });

  it('has no answer without a curve, rather than falling back to a daily total', () => {
    const built = buildLyingDownWeek({
      result: series([]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(usualByNow(built, undefined)).toBeNull();
    expect(usualByNow(built, [])).toBeNull();
  });
});

/**
 * Guards for the three defects the 2026-08-20 audit found in THIS repo while
 * checking that we had not reproduced the shipping app's.
 *
 * Inakshi decided not to raise dev-team tickets for the production bugs, on the
 * explicit condition that the rewrite does not carry them. That makes these
 * regressions, not merely bugs — each one puts the decision itself back in play.
 */
describe('defects found by audit', () => {
  it('never marks a day observed on a series whose bouts it then ignores', () => {
    // Two cameras on one stall. The first saw nothing on the 18th; the second
    // did. Scanning both for coverage while reading bouts from the first alone
    // made the 18th "observed" with no bouts — an observed ZERO, which reads as
    // "the horse never lay down" rather than "we cannot combine these".
    const quiet = series([])[0]!;
    const secondCamera: PrometheusRangeSeries = {
      metric: { animal_type: 'horse', id: '1' },
      values: quiet.values.map(([t]) => [t, '1'] as [number, string]),
    };
    const week = buildLyingDownWeek({
      result: [{ ...quiet, values: quiet.values.slice(0, 10) }, secondCamera],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });

    const uncovered = week.days.filter((day) => day.coverage === 'no-observations');
    expect(uncovered.length).toBeGreaterThan(0);
    // The days the first series never reached must be null, never 0.
    for (const day of uncovered) expect(day.totalSeconds).toBeNull();
  });

  it('refuses to draw at all when several series match, rather than picking one', () => {
    // The shipping app SUMS them, which can exceed 24 hours in a day. Reading
    // only the first hides a camera. Both are worse than saying so.
    const one = series([['2026-08-19T08:00:00', '2026-08-19T09:00:00']]);
    const week = buildLyingDownWeek({
      result: [one[0]!, { ...one[0]!, metric: { animal_type: 'horse', id: '1' } }],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(week.state).toBe('unavailable');
  });

  it('reads a zone-less created_at in the barn timezone, not the phone one', () => {
    // A bare date has no offset, so Luxon would use the DEVICE zone. For a
    // stall sitting exactly on the boundary that moves the verdict by a day.
    // A barn at +14, early in its morning. The stall was created exactly seven
    // barn-days ago, so it has just enough history and must be judged.
    const now = DateTime.fromISO('2026-08-19T02:00:00', { zone: 'Pacific/Kiritimati' });
    const createdAt = '2026-08-12';

    // Read in the barn's zone that is midnight on the 12th — before the 02:00
    // cutoff, so it qualifies. Read in the test runner's zone it is 2 PM on the
    // 12th, which is AFTER the cutoff, and the horse silently loses its verdict
    // for a day. Same string, same instant, different answer.
    expect(hasEnoughHistory(createdAt, 'daily', now)).toBe(true);
  });
});

/**
 * One rule at both scales (Inakshi, 2026-08-20).
 *
 * A DAY with holes in its readings is badged Incomplete rather than compared
 * against a normal. A WEEK with a missing day is the same statement one level
 * up, so it gets the same answer — rather than a minimum-days threshold nobody
 * has approved.
 */
describe('weekly verdict when days are missing', () => {
  const usualByWeekday = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, 5700]));

  it('judges a week only when every finished day was observed', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-18T22:00:00', '2026-08-18T23:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    const summary = buildLyingDownWeekly(week, { usualSecondsByWeekday: usualByWeekday });
    expect(summary.verdict).not.toBe('incomplete');
  });

  it('withholds the weekly badge when a day went unobserved', () => {
    const full = series([['2026-08-18T22:00:00', '2026-08-18T23:30:00']])[0]!;
    // A whole BARN day, 06:00 to 06:00 — a calendar day leaves samples either
    // side of the rollover, so the day still counts as observed.
    const gapFrom = DateTime.fromISO('2026-08-16T06:00:00', { zone: ZONE }).toSeconds();
    const gapTo = DateTime.fromISO('2026-08-17T06:00:00', { zone: ZONE }).toSeconds();
    const week = buildLyingDownWeek({
      result: [{ ...full, values: full.values.filter(([t]) => t < gapFrom || t >= gapTo) }],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    const summary = buildLyingDownWeekly(week, { usualSecondsByWeekday: usualByWeekday });

    expect(summary.verdict).toBe('incomplete');
    // The average over the days we DID see is still reported, with its count —
    // that is a description of what was observed, not a judgement.
    expect(summary.observedDays).toBeLessThan(6);
    expect(summary.dailyAverageSeconds).not.toBeNull();
  });
});

/**
 * Working with what we've got (Inakshi, 2026-08-23).
 *
 * The upstream average hides its own divisor, so a dead camera day drags the
 * usual line down invisibly. Rather than wait for Data Science to return the
 * day count, the app checks the window itself — it already fetches those seven
 * days to draw the chart. Conservative by design: it can only confirm the
 * window looks complete, never that the upstream divisor was right.
 */
describe('usualWindowObserved', () => {
  it('accepts a week whose finished days were all observed', () => {
    const week = buildLyingDownWeek({
      result: series([['2026-08-18T22:00:00', '2026-08-18T23:30:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(usualWindowObserved(week)).toBe(true);
  });

  it('rejects a week with a day the monitor never reported', () => {
    const full = series([['2026-08-18T22:00:00', '2026-08-18T23:30:00']])[0]!;
    const from = DateTime.fromISO('2026-08-16T06:00:00', { zone: ZONE }).toSeconds();
    const to = DateTime.fromISO('2026-08-17T06:00:00', { zone: ZONE }).toSeconds();
    const week = buildLyingDownWeek({
      result: [{ ...full, values: full.values.filter(([t]) => t < from || t >= to) }],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(usualWindowObserved(week)).toBe(false);
  });

  it('rejects a week with a day only partly recorded', () => {
    // A four-hour hole still means an undercounted day inside the average.
    const full = series([['2026-08-18T22:00:00', '2026-08-18T23:30:00']])[0]!;
    const from = DateTime.fromISO('2026-08-16T11:40:00', { zone: ZONE }).toSeconds();
    const to = DateTime.fromISO('2026-08-16T15:30:00', { zone: ZONE }).toSeconds();
    const week = buildLyingDownWeek({
      result: [{ ...full, values: full.values.filter(([t]) => t < from || t >= to) }],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(usualWindowObserved(week)).toBe(false);
  });
});
