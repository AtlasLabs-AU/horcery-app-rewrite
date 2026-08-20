import { DateTime } from 'luxon';

import type { LyingDownWeeklyDay } from '@/charts/lying-down';
import { RESTS, VISITS, weeklyDayDetail } from '@/components/charts/weekly-day-detail';

const ZONE = 'America/Chicago';
const MONDAY = '2026-08-17';

/** 07:02, 12:00 and 17:10 on the Monday, as the model would carry them. */
const at = (hour: number, minute: number) =>
  DateTime.fromISO(MONDAY, { zone: ZONE }).set({ hour, minute }).toSeconds();

/** `count` is the occupancy model's headcount; this chart never reads it. */
const stretch = (enter: number, exit: number) => ({ enter, exit, count: 1 });

function day(overrides: Partial<LyingDownWeeklyDay> = {}): LyingDownWeeklyDay {
  return {
    key: MONDAY,
    weekday: 'M',
    totalSeconds: 6240,
    usualSeconds: 5700,
    isToday: false,
    verdict: 'usual',
    coverage: 'observed',
    start: DateTime.fromISO(MONDAY, { zone: ZONE }).set({ hour: 6 }).toSeconds(),
    end: DateTime.fromISO(MONDAY, { zone: ZONE }).plus({ days: 1 }).set({ hour: 6 }).toSeconds(),
    bouts: [
      stretch(at(7, 2), at(7, 40)),
      stretch(at(12, 0), at(12, 30)),
      stretch(at(17, 10), at(17, 46)),
    ],
    ...overrides,
  };
}

/**
 * The wording Inakshi agreed line by line on 2026-08-20, pinned so it cannot
 * drift. Two detail lines she explicitly removed are asserted absent, because
 * "the monitor wasn't reporting" and "still counting" each repeated the word
 * directly above them.
 */
describe('weeklyDayDetail', () => {
  it('names an ordinary day with its total and its visit times', () => {
    expect(weeklyDayDetail(day(), ZONE, VISITS)).toEqual({
      title: 'Monday · 1 h 44 min',
      detail: '3 visits · 7:02 AM, 12:00 PM, 5:10 PM',
    });
  });

  it('summarises a busy day rather than listing every visit', () => {
    const bouts = Array.from({ length: 27 }, (_, i) =>
      stretch(at(6, 30) + i * 1800, at(6, 30) + i * 1800 + 360),
    );
    const result = weeklyDayDetail(day({ bouts, totalSeconds: 9720 }), ZONE, VISITS);
    expect(result.detail).toMatch(/^27 visits · first .+, last .+$/);
  });

  it('says No data with nothing after it, because the title is the whole fact', () => {
    const result = weeklyDayDetail(
      day({ key: '2026-08-15', totalSeconds: null, coverage: 'no-observations', bouts: [] }),
      ZONE,
      VISITS,
    );
    expect(result).toEqual({ title: 'Saturday · No data' });
    // Removed by Inakshi: "No data" already says the monitor was not reporting.
    expect(result.detail).toBeUndefined();
  });

  it('keeps a watched-but-empty day distinct from an unobserved one', () => {
    // The two look nearly identical on the chart and mean opposite things.
    expect(weeklyDayDetail(day({ totalSeconds: 0, bouts: [] }), ZONE, VISITS)).toEqual({
      title: 'Monday · 0 min',
      detail: 'No visits',
    });
  });

  it('gives a partly recorded day no detail line', () => {
    // Listing the visits we did see would imply the list is complete.
    expect(weeklyDayDetail(day({ coverage: 'partial' }), ZONE, VISITS)).toEqual({
      title: 'Monday · 1 h 44 min',
    });
  });

  it('reports today as ongoing progress, never as a comparable total', () => {
    const result = weeklyDayDetail(day({ isToday: true, totalSeconds: 4320 }), ZONE, VISITS);
    expect(result).toEqual({ title: 'Today · Ongoing', detail: '1 h 12 min so far' });
    // Removed by Inakshi: "Ongoing" already says it is still counting.
    expect(result.detail).not.toMatch(/still counting/);
  });

  it('reports an empty today the same way, not as an absence', () => {
    expect(weeklyDayDetail(day({ isToday: true, totalSeconds: 0, bouts: [] }), ZONE, VISITS))
      .toEqual({ title: 'Today · Ongoing', detail: '0 min so far' });
  });

  it('uses each behaviour own noun rather than inheriting one', () => {
    expect(weeklyDayDetail(day(), ZONE, RESTS).detail).toMatch(/^3 rests · /);
    expect(weeklyDayDetail(day({ bouts: [stretch(at(7, 2), at(7, 40))] }), ZONE, RESTS))
      .toMatchObject({ detail: '1 rest · 7:02 AM' });
  });
});
