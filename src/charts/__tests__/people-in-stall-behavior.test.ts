import { DateTime } from 'luxon';

import {
  buildPeopleInStallWeek,
  buildPeopleInStallWeekly,
  outageCaption,
  visitsCaption,
  MAX_LISTED_VISITS,
} from '@/charts/people-in-stall-behavior';
import {
  barelyVisited,
  busyDay,
  monitorGapMidday,
  noData,
  routineWeek,
} from '@/charts/fixtures/people-in-stall-behavior';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

const ZONE = 'America/Chicago';
/** Late in the barn day, so a full routine has happened. */
const NOW = DateTime.fromISO('2026-08-19T22:00:00', { zone: ZONE });
const SELECTED = NOW.minus({ hours: 6 }).toFormat('yyyy-MM-dd');
const ESTABLISHED = NOW.minus({ months: 6 }).toISO();
const ts = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toSeconds();

function build(
  result: PrometheusRangeSeries[],
  overrides: Partial<Parameters<typeof buildPeopleInStallWeek>[0]> = {},
) {
  return buildPeopleInStallWeek({
    result,
    selectedDate: SELECTED,
    zone: ZONE,
    now: NOW,
    stallCreatedAt: ESTABLISHED,
    ...overrides,
  });
}

/** A stall's usual progress: most human time lands around the feed times. */
const usualCurve = [
  { fractionOfDay: 0, lowSeconds: 0, highSeconds: 0 },
  { fractionOfDay: 0.1, lowSeconds: 1500, highSeconds: 2500 },
  { fractionOfDay: 0.4, lowSeconds: 2700, highSeconds: 3900 },
  { fractionOfDay: 0.6, lowSeconds: 4500, highSeconds: 6300 },
  { fractionOfDay: 1, lowSeconds: 5100, highSeconds: 6900 },
];

describe('buildPeopleInStallWeek', () => {
  it('measures occupied time, and counts visits rather than people', () => {
    const result = build(routineWeek(NOW), { usualCurve });
    // Three feed-time visits, as the routine fixture describes.
    expect(result.today?.visits).toHaveLength(3);
    // The signal is binary presence, so the total is time the stall was
    // occupied — never multiplied by how many people were in it.
    expect(result.today?.totalSeconds).toBeGreaterThan(0);
    const spanned = result.today!.visits.reduce((sum, v) => sum + (v.exit - v.enter), 0);
    expect(result.today?.totalSeconds).toBeCloseTo(spanned, -2);
  });

  it('calls a normal routine usual, and a barely-visited day low', () => {
    expect(build(routineWeek(NOW), { usualCurve }).verdict).toBe('usual');
    expect(build(barelyVisited(NOW), { usualCurve }).verdict).toBe('low');
  });

  it('withholds a verdict on a stall too new to have a normal', () => {
    // Same data, but the monitor went in three days ago.
    const young = build(routineWeek(NOW), {
      usualCurve,
      stallCreatedAt: NOW.minus({ days: 3 }).toISO(),
    });
    expect(young.verdict).toBe('unknown');
  });

  it('never reads an absent monitor as an empty stall', () => {
    const result = build(noData, { usualCurve });
    expect(result.today?.totalSeconds ?? null).toBeNull();
    expect(result.verdict).toBe('no-data');
  });

  it('marks the hours it could not see, rather than counting them as quiet', () => {
    const result = build(monitorGapMidday(NOW), { usualCurve });
    expect(result.today?.unobserved.length).toBeGreaterThan(0);
  });

  it('treats corrupt samples as an outage rather than a fully watched day', () => {
    const corruptFrom = ts('2026-08-19T11:40:00');
    const corruptTo = ts('2026-08-19T15:30:00');
    const corrupt = routineWeek(NOW).map((raw) => ({
      ...raw,
      values: raw.values.map(([at, value]) => [
        at,
        at >= corruptFrom && at <= corruptTo ? 'NaN' : value,
      ] as [number, string]),
    }));

    const result = build(corrupt, { usualCurve });

    expect(result.today?.unobserved.length).toBeGreaterThan(0);
    expect(result.verdict).toBe('incomplete');
    expect(outageCaption(result.today, ZONE)).toMatch(/^Monitor offline .+ — visits then are unknown$/);
  });
});

describe('buildPeopleInStallWeekly', () => {
  it('needs four weeks of history before it judges a week', () => {
    const { week } = build(routineWeek(NOW));
    const flat = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, 5400]));

    const established = buildPeopleInStallWeekly(week, {
      usualSecondsByWeekday: flat,
      stallCreatedAt: ESTABLISHED,
      now: NOW,
    });
    expect(established.verdict).not.toBe('unknown');

    // Old enough for the daily view, still too new for a four-week comparison.
    const young = buildPeopleInStallWeekly(week, {
      usualSecondsByWeekday: flat,
      stallCreatedAt: NOW.minus({ days: 10 }).toISO(),
      now: NOW,
    });
    expect(young.verdict).toBe('unknown');
  });
});

/**
 * The caption rule (Inakshi, 2026-08-19): up to three visits are listed with
 * their real clock times; beyond that the count with first and last. Never
 * dayparts — "morning" would mean inventing the hour morning ends.
 */
describe('visitsCaption', () => {
  it('lists the times when there are few enough to read', () => {
    const { today } = build(routineWeek(NOW));
    const caption = visitsCaption(today, ZONE);
    expect(today!.visits.length).toBeLessThanOrEqual(MAX_LISTED_VISITS);
    expect(caption).toMatch(/^3 visits · /);
    // Real clock times, not classifications.
    expect(caption).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    expect(caption).not.toMatch(/morning|midday|afternoon|evening/i);
  });

  it('summarises a busy day instead of listing every visit', () => {
    const { today } = build(busyDay(NOW));
    expect(today!.visits.length).toBeGreaterThan(MAX_LISTED_VISITS);
    const caption = visitsCaption(today, ZONE);
    expect(caption).toMatch(/^\d+ visits · first .+, last .+$/);
    // A caption that grew with the data would overflow the row on a busy stall.
    expect(caption.length).toBeLessThan(60);
  });

  it('says we do not know, rather than "no visits", when nothing was observed', () => {
    const { today } = build(noData);
    expect(visitsCaption(today, ZONE)).toBe("We can't tell whether anyone visited");
  });
});

describe('outageCaption', () => {
  it('states when the monitor was offline, with times', () => {
    const { today } = build(monitorGapMidday(NOW));
    const caption = outageCaption(today, ZONE);
    expect(caption).toMatch(/^Monitor offline .+ – .+ — visits then are unknown$/);
  });

  it('is absent on a fully observed day', () => {
    const { today } = build(routineWeek(NOW));
    expect(outageCaption(today, ZONE)).toBeNull();
  });
});
