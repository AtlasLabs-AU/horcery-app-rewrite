import { DateTime } from 'luxon';

import {
  buildOccupancyTimeline,
  dayLabel,
  hourTicks,
  intervalTooltip,
  positionInDay,
  type PrometheusRangeSeries,
} from '@/charts/occupancy-timeline';
import {
  FIXTURES,
  PEOPLE_IN_STALL,
  daylightSaving,
  daylightSavingFallBack,
  denseWeek,
  noData,
  normalWeek,
  overnight,
  partialToday,
  quietWeek,
  worstCase,
} from '@/charts/fixtures/people-in-stall';

/**
 * Characterisation of the People In Stall data behaviour (requirements §6a).
 *
 * The expected values here were derived by reading the current app's
 * `processSeries` and `compound-bar-chart.ts` and working the arithmetic by
 * hand, not by running the old code — so a test that fails is either a porting
 * error here or a legacy quirk we chose to drop, and PEOPLE_IN_STALL.md says
 * which. Both spikes render exactly what these tests pin down.
 */

const ZONE = 'America/Chicago';
const T = (iso: string) => DateTime.fromISO(iso, { zone: ZONE });
const secs = (iso: string) => T(iso).toSeconds();

/** Builds one series from `[isoTime, value]` pairs at 90s spacing where omitted. */
const series = (eventType: string, points: [string, string][]): PrometheusRangeSeries => ({
  metric: { Event_Type: eventType, instance: 'sm-1:9100' },
  values: points.map(([iso, v]) => [secs(iso), v]),
});

const build = (result: PrometheusRangeSeries[], overrides: Partial<Parameters<typeof buildOccupancyTimeline>[0]> = {}) =>
  buildOccupancyTimeline({
    result,
    selectedDate: '2026-08-14',
    zone: ZONE,
    threshold: PEOPLE_IN_STALL.threshold,
    now: T('2026-08-15T09:00:00'),
    ...overrides,
  });

describe('rows', () => {
  it('shows seven days ending on the selected date, oldest first, cut at local midnight', () => {
    const { days } = build([]);

    expect(days.map((d) => d.key)).toEqual([
      '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
    ]);
    expect(days[0]!.start).toBe(secs('2026-08-08T00:00:00'));
    expect(days[0]!.end).toBe(secs('2026-08-09T00:00:00'));
    expect(days.every((d) => !d.isToday)).toBe(true);
  });

  it('cuts days in the ORGANIZATION zone, not the phone zone', () => {
    // 2026-08-14 23:30 in Chicago is already 2026-08-15 in New York and UTC.
    const late = series('Human_Interaction', [['2026-08-14T23:30:00', '1'], ['2026-08-14T23:31:30', '0']]);

    const chicago = build([late]);
    const utc = build([late], { zone: 'UTC' });

    expect(Object.keys(chicago.series[0]!.intervalsByDay)).toEqual(['2026-08-14']);
    // In UTC that moment is 04:30 on the 15th — outside the seven visible rows.
    expect(Object.keys(utc.series[0]!.intervalsByDay)).toEqual([]);
  });

  it('marks today and stops the row at now', () => {
    const now = T('2026-08-14T14:20:00');
    const { days } = build([], { now });

    const today = days[6]!;
    expect(today.isToday).toBe(true);
    expect(today.end).toBe(now.toSeconds());
    expect(days[5]!.isToday).toBe(false);
  });

  it('takes the selected date as a CALENDAR date, so the week cannot slide with the viewer', () => {
    // 2026-08-14 is 2026-08-14 in Chicago whether the manager reading it is in
    // Chicago, Colombo or Sydney. (Accepting an instant here would make
    // midnight-in-Colombo on the 14th into the 13th in Chicago.)
    for (const zone of ['America/Chicago', 'Asia/Colombo', 'Australia/Sydney']) {
      expect(build([], { zone }).days.at(-1)!.key).toBe('2026-08-14');
    }
  });

  it('rejects anything that is not a plain yyyy-MM-dd date', () => {
    expect(() => build([], { selectedDate: '2026-08-14T00:00:00' })).toThrow(/calendar date/);
    expect(() => build([], { selectedDate: '2026-08-14T00:00:00+05:30' })).toThrow(/calendar date/);
    expect(() => build([], { selectedDate: '14/08/2026' })).toThrow(/calendar date/);
    expect(() => build([], { selectedDate: '2026-02-30' })).toThrow(/not a real date/);
  });

  it('labels rows "MMM dd" as the current app does', () => {
    const { days } = build([]);
    expect(dayLabel(days[6]!, ZONE)).toBe('Aug 14');
    expect(dayLabel(days[0]!, ZONE)).toBe('Aug 08');
  });
});

describe('intervals', () => {
  it('opens on a rise above threshold and closes when the value changes', () => {
    const s = series('Human_Interaction', [
      ['2026-08-14T07:00:00', '0'],
      ['2026-08-14T07:01:30', '1'],
      ['2026-08-14T07:03:00', '1'],
      ['2026-08-14T07:04:30', '2'],
      ['2026-08-14T07:06:00', '0'],
    ]);

    const { series: [out], intervalCount } = build([s]);

    expect(out!.intervalsByDay['2026-08-14']).toEqual([
      { enter: secs('2026-08-14T07:01:30'), exit: secs('2026-08-14T07:04:30'), count: 1 },
      { enter: secs('2026-08-14T07:04:30'), exit: secs('2026-08-14T07:06:00'), count: 2 },
    ]);
    expect(intervalCount).toBe(2);
  });

  it('treats values at or below the threshold as nobody there', () => {
    const s = series('Human_Interaction', [
      ['2026-08-14T07:00:00', '0.2'], // exactly threshold: excluded
      ['2026-08-14T07:01:30', '0.3'], // above: included, rounds to 0 people
      ['2026-08-14T07:03:00', '0'],
    ]);

    const [out] = build([s]).series;

    expect(out!.intervalsByDay['2026-08-14']).toEqual([
      { enter: secs('2026-08-14T07:01:30'), exit: secs('2026-08-14T07:03:00'), count: 0 },
    ]);
  });

  it('closes a still-open bar at the next midnight, so it reaches the row edge', () => {
    const s = series('Human_Interaction', [
      ['2026-08-13T23:55:30', '0'],
      ['2026-08-13T23:57:00', '1'],
      ['2026-08-13T23:58:30', '1'],
    ]);

    const [out] = build([s]).series;

    expect(out!.intervalsByDay['2026-08-13']).toEqual([
      { enter: secs('2026-08-13T23:57:00'), exit: secs('2026-08-14T00:00:00'), count: 1 },
    ]);
  });

  it('closes a still-open bar at NOW on the current day, never in the future', () => {
    const now = T('2026-08-14T14:20:00');
    const s = series('Human_Interaction', [
      ['2026-08-14T14:00:00', '0'],
      ['2026-08-14T14:01:30', '2'],
      ['2026-08-14T14:19:30', '2'],
      ['2026-08-14T14:21:00', '2'], // in the future relative to `now`: dropped
    ]);

    const [out] = build([s], { now }).series;

    expect(out!.intervalsByDay['2026-08-14']).toEqual([
      { enter: secs('2026-08-14T14:01:30'), exit: now.toSeconds(), count: 2 },
    ]);
  });

  it('does NOT stretch a bar that ended at 23:58:30 to midnight (legacy quirk dropped)', () => {
    // The current app adds 89s to an interval that happens to end on the last
    // sample of the day, purely to hide a hairline gap. That paints 90 seconds
    // of occupancy that the data says did not happen. We keep the true end.
    const s = series('Human_Interaction', [
      ['2026-08-13T23:55:30', '1'],
      ['2026-08-13T23:57:00', '1'],
      ['2026-08-13T23:58:30', '0'],
    ]);

    const [out] = build([s]).series;

    expect(out!.intervalsByDay['2026-08-13']![0]!.exit).toBe(secs('2026-08-13T23:58:30'));
  });

  it('sorts samples defensively — an interleaved series still yields the right bars', () => {
    const s = series('Human_Interaction', [
      ['2026-08-14T07:03:00', '1'],
      ['2026-08-14T07:00:00', '0'],
      ['2026-08-14T07:04:30', '0'],
      ['2026-08-14T07:01:30', '1'],
    ]);

    const [out] = build([s]).series;

    expect(out!.intervalsByDay['2026-08-14']).toEqual([
      { enter: secs('2026-08-14T07:01:30'), exit: secs('2026-08-14T07:04:30'), count: 1 },
    ]);
  });

  it('splits a visit that crosses midnight into two rows', () => {
    const s = series('Human_Interaction', [
      ['2026-08-13T23:57:00', '1'],
      ['2026-08-13T23:58:30', '1'],
      ['2026-08-14T00:00:00', '1'],
      ['2026-08-14T00:01:30', '1'],
      ['2026-08-14T00:03:00', '0'],
    ]);

    const [out] = build([s]).series;

    expect(out!.intervalsByDay['2026-08-13']).toEqual([
      { enter: secs('2026-08-13T23:57:00'), exit: secs('2026-08-14T00:00:00'), count: 1 },
    ]);
    expect(out!.intervalsByDay['2026-08-14']).toEqual([
      { enter: secs('2026-08-14T00:00:00'), exit: secs('2026-08-14T00:03:00'), count: 1 },
    ]);
  });

  it('keeps series apart by Event_Type', () => {
    const { series: out } = build([
      series('Human_Interaction', [['2026-08-14T07:00:00', '1'], ['2026-08-14T07:01:30', '0']]),
      series('Human_Presence', [['2026-08-14T07:00:00', '0'], ['2026-08-14T07:01:30', '1'], ['2026-08-14T07:03:00', '0']]),
    ]);

    expect(out.map((s) => s.id)).toEqual(['Human_Interaction', 'Human_Presence']);
    expect(out[0]!.intervalsByDay['2026-08-14']).toHaveLength(1);
    expect(out[1]!.intervalsByDay['2026-08-14']).toHaveLength(1);
  });

  it('is pure — the same input yields the same output', () => {
    expect(build(normalWeek.result)).toEqual(build(normalWeek.result));
  });
});

describe('presentation', () => {
  const day = build([]).days[6]!;

  it('positions moments across the row from local midnight (0) to the next (1)', () => {
    expect(positionInDay(secs('2026-08-14T00:00:00'), day, ZONE)).toBe(0);
    expect(positionInDay(secs('2026-08-14T06:00:00'), day, ZONE)).toBeCloseTo(0.25);
    expect(positionInDay(secs('2026-08-14T18:00:00'), day, ZONE)).toBeCloseTo(0.75);
    expect(positionInDay(secs('2026-08-15T00:00:00'), day, ZONE)).toBe(1);
  });

  it('labels hours "h a", 12 AM through 12 AM — one shared axis for every row', () => {
    const ticks = hourTicks();

    expect(ticks).toHaveLength(25);
    expect(ticks[0]).toEqual({ label: '12 AM', position: 0 });
    expect(ticks[12]).toEqual({ label: '12 PM', position: 0.5 });
    expect(ticks[24]).toEqual({ label: '12 AM', position: 1 });
  });

  it('positions by CLOCK time, so 7 AM lines up down every row — as the current app does', () => {
    // A daylight-saving week: the same clock hour must sit at the same x on
    // the 23-hour day, the 25-hour day and an ordinary day. That vertical
    // alignment is the chart's whole reading grammar.
    const spring = build([], { selectedDate: '2026-03-08', now: T('2026-03-09T09:00:00') }).days[6]!;
    const fall = build([], { selectedDate: '2026-11-01', now: T('2026-11-02T09:00:00') }).days[6]!;

    expect(spring.end - spring.start).toBe(23 * 3600);
    expect(fall.end - fall.start).toBe(25 * 3600);
    expect(positionInDay(secs('2026-03-08T07:00:00'), spring, ZONE)).toBeCloseTo(7 / 24);
    expect(positionInDay(secs('2026-11-01T07:00:00'), fall, ZONE)).toBeCloseTo(7 / 24);
    expect(positionInDay(secs('2026-08-14T07:00:00'), day, ZONE)).toBeCloseTo(7 / 24);
    // The closing midnight is 1 on every row, however long the day was.
    expect(positionInDay(spring.end, spring, ZONE)).toBe(1);
    expect(positionInDay(fall.end, fall, ZONE)).toBe(1);
  });

  it('pays for clock alignment twice a year, and the tests say exactly how', () => {
    // SPRING FORWARD — 2 AM never happens. One real hour spans two clock hours.
    const spring = build([], { selectedDate: '2026-03-08', now: T('2026-03-09T09:00:00') }).days[6]!;
    const oneThirty = secs('2026-03-08T01:30:00'); // CST
    const threeThirty = secs('2026-03-08T03:30:00'); // CDT — one real hour later
    expect(threeThirty - oneThirty).toBe(3600);
    expect(positionInDay(threeThirty, spring, ZONE) - positionInDay(oneThirty, spring, ZONE)).toBeCloseTo(2 / 24);

    // FALL BACK — 1 AM happens twice. Both land in the same slot; a bar
    // spanning the repeated hour has zero width and relies on the renderer's
    // 1 px minimum to be seen at all.
    const fall = build([], { selectedDate: '2026-11-01', now: T('2026-11-02T09:00:00') }).days[6]!;
    const firstOneThirty = DateTime.fromISO('2026-11-01T01:30:00-05:00').toSeconds();
    const secondOneThirty = DateTime.fromISO('2026-11-01T01:30:00-06:00').toSeconds();
    expect(secondOneThirty - firstOneThirty).toBe(3600);
    expect(positionInDay(firstOneThirty, fall, ZONE)).toBeCloseTo(1.5 / 24);
    expect(positionInDay(secondOneThirty, fall, ZONE)).toBeCloseTo(1.5 / 24);
  });

  it('formats the tooltip word for word as the current app', () => {
    const interval = { enter: secs('2026-08-14T07:02:00'), exit: secs('2026-08-14T07:41:00'), count: 2 };

    expect(intervalTooltip(interval, ZONE)).toBe('2026-08-14  |  7:02 AM - 7:41 AM\nNo. of people: 2');
    expect(intervalTooltip(interval, ZONE, { showCount: false })).toBe('2026-08-14  |  7:02 AM - 7:41 AM');
  });
});

describe('People In Stall fixtures', () => {
  it('are all buildable and each says what it stresses', () => {
    for (const fixture of FIXTURES) {
      expect(fixture.purpose.length).toBeGreaterThan(30);
      const timeline = buildOccupancyTimeline({
        result: fixture.result,
        selectedDate: fixture.selectedDate,
        zone: fixture.zone,
        threshold: PEOPLE_IN_STALL.threshold,
        now: DateTime.fromISO(fixture.now, { zone: fixture.zone }),
      });
      expect(timeline.days).toHaveLength(7);
    }
  });

  it('are shaped exactly like the Prometheus response the app receives', () => {
    const [withHorse, withoutHorse] = normalWeek.result;

    expect(withHorse!.metric.Event_Type).toBe('Human_Interaction');
    expect(withoutHorse!.metric.Event_Type).toBe('Human_Presence');
    // One sample per 90s over 7 days.
    expect(withHorse!.values).toHaveLength((7 * 24 * 3600) / 90);
    expect(withHorse!.values[1]![0] - withHorse!.values[0]![0]).toBe(90);
    // Values are strings, as Prometheus sends them.
    expect(typeof withHorse!.values[0]![1]).toBe('string');
  });

  it('never have a person both with and without the horse at the same instant', () => {
    for (const fixture of [normalWeek, denseWeek, overnight]) {
      const [a, b] = fixture.result;
      for (let i = 0; i < a!.values.length; i++) {
        const both = Number(a!.values[i]![1]) > 0 && Number(b!.values[i]![1]) > 0;
        expect(both).toBe(false);
      }
    }
  });

  const count = (fixture: (typeof FIXTURES)[number]) =>
    buildOccupancyTimeline({
      result: fixture.result,
      selectedDate: fixture.selectedDate,
      zone: fixture.zone,
      threshold: PEOPLE_IN_STALL.threshold,
      now: DateTime.fromISO(fixture.now, { zone: fixture.zone }),
    });

  it('give the spikes a real spread of load', () => {
    // These numbers are the fixtures' fingerprint. If one changes, the seed or
    // the plans changed, and every measurement taken before is now on
    // different data — which is fine, but must be known.
    expect(count(normalWeek).intervalCount).toBe(38);
    expect(count(denseWeek).intervalCount).toBe(374);
    expect(count(quietWeek).intervalCount).toBe(0);
    expect(count(noData).series).toEqual([]);
    // The ceiling: every 90 s sample a bar. 7 × 960.
    expect(count(worstCase).intervalCount).toBe(6720);
  });

  it('worst case is genuinely the ceiling — no fixture can exceed one bar per sample', () => {
    const t = count(worstCase);
    const samples = worstCase.result[0]!.values.length;
    expect(t.intervalCount).toBe(samples);
    // Every bar is exactly one step long.
    for (const s of t.series) {
      for (const day of Object.values(s.intervalsByDay)) {
        for (const bar of day) expect(bar.exit - bar.enter).toBe(PEOPLE_IN_STALL.step);
      }
    }
  });

  it('fall-back week contains the 25-hour day', () => {
    const t = count(daylightSavingFallBack);
    const dstDay = t.days.find((d) => d.key === '2026-11-01')!;
    expect(dstDay.end - dstDay.start).toBe(25 * 3600);
    // The generator sampled the whole 25 hours: 1000 samples that day, not 960.
    const thatDay = daylightSavingFallBack.result[0]!.values.filter(
      ([ts]) => ts >= dstDay.start && ts < dstDay.end,
    );
    expect(thatDay).toHaveLength(1000);
  });

  it('quiet week is seven empty rows, not "No Data" — the distinction is a valid response', () => {
    const t = count(quietWeek);
    expect(t.series).toHaveLength(2);
    expect(t.intervalCount).toBe(0);
  });

  it('partial today ends at now with the open bar reaching it', () => {
    const t = count(partialToday);
    const today = t.days[6]!;
    const now = DateTime.fromISO(partialToday.now, { zone: partialToday.zone }).toSeconds();

    expect(today.isToday).toBe(true);
    expect(today.end).toBe(now);
    const bars = t.series[0]!.intervalsByDay[today.key]!;
    expect(bars[bars.length - 1]!.exit).toBe(now);
  });

  it('overnight visit spans two rows edge to edge', () => {
    const t = count(overnight);
    const withHorse = t.series[0]!;
    const sixth = t.days[5]!;
    const seventh = t.days[6]!;

    const lastOnSixth = withHorse.intervalsByDay[sixth.key]!.at(-1)!;
    const firstOnSeventh = withHorse.intervalsByDay[seventh.key]![0]!;
    expect(lastOnSixth.exit).toBe(sixth.end);
    expect(firstOnSeventh.enter).toBe(seventh.start);
  });

  it('daylight-saving week contains the 23-hour day', () => {
    const t = count(daylightSaving);
    const dstDay = t.days.find((d) => d.key === '2026-03-08')!;
    expect(dstDay.end - dstDay.start).toBe(23 * 3600);
  });
});

/**
 * Two QA-confirmed defects from the shipping app that must never enter this
 * builder (Codex review; verified in legacy source; sign-off Inakshi
 * 2026-08-21). Both would make every behaviour chart lie at once, because all
 * three draw from this one interval builder.
 */
describe('defects the shipping app has', () => {
  /** A minute-cadence run of "present" samples over the given ranges. */
  const presentDuring = (
    ranges: [string, string][],
    gaps: [string, string][] = [],
  ): [number, string][] => {
    const points: [number, string][] = [];
    for (let t = secs('2026-08-14T06:00:00'); t <= secs('2026-08-14T12:00:00'); t += 60) {
      if (gaps.some(([a, b]) => t > secs(a) && t < secs(b))) continue;
      const on = ranges.some(([a, b]) => t >= secs(a) && t < secs(b));
      points.push([t, on ? '1' : '0']);
    }
    return points;
  };

  it('never lets an interval span a hole in the data', () => {
    // Present 7–8, monitor silent 8–11, present again 11–12. The legacy
    // builder bridges the silence and reports five occupied hours; only two
    // were observed. The silence belongs to the coverage layer, not to a bar.
    const raw: PrometheusRangeSeries = {
      metric: { Event_Type: 'Human_Presence', instance: 'sm-1:9100' },
      values: presentDuring(
        [['2026-08-14T07:00:00', '2026-08-14T12:00:00']],
        [['2026-08-14T08:00:00', '2026-08-14T11:00:00']],
      ),
    };
    const { series: built } = build([raw]);
    const intervals = built[0]!.intervalsByDay['2026-08-14']!;

    const total = intervals.reduce((sum, i) => sum + (i.exit - i.enter), 0);
    expect(intervals.length).toBe(2);
    // Two observed hours, give or take the sample step — never five.
    expect(total).toBeLessThanOrEqual(2 * 3600 + 120);
    // And no interval crosses the silent stretch.
    for (const interval of intervals) {
      expect(
        interval.enter >= secs('2026-08-14T11:00:00') ||
          interval.exit <= secs('2026-08-14T08:00:00') + 120,
      ).toBe(true);
    }
  });

  it('closes a trailing open interval at the last observed sample, not the edge', () => {
    // Samples stop at 08:00 while still "present". Running the bar to the end
    // of the window would count four silent hours as presence.
    const raw: PrometheusRangeSeries = {
      metric: { Event_Type: 'Human_Presence', instance: 'sm-1:9100' },
      values: presentDuring([['2026-08-14T07:00:00', '2026-08-14T12:00:00']]).filter(
        ([t]) => t <= secs('2026-08-14T08:00:00'),
      ),
    };
    const { series: built } = build([raw], { now: T('2026-08-14T12:00:00') });
    const intervals = built[0]!.intervalsByDay['2026-08-14']!;
    expect(intervals.at(-1)!.exit).toBeLessThanOrEqual(secs('2026-08-14T08:00:00'));
  });

  it('treats "1" and "1.0" as the same reading, not a new visit', () => {
    // Prometheus serialises the same value both ways. Comparing the text made
    // one continuous visit display as two.
    const values: [number, string][] = [];
    for (let t = secs('2026-08-14T07:00:00'); t <= secs('2026-08-14T08:00:00'); t += 60) {
      values.push([t, t < secs('2026-08-14T07:30:00') ? '1' : '1.0']);
    }
    values.push([secs('2026-08-14T08:01:00'), '0']);
    const raw: PrometheusRangeSeries = {
      metric: { Event_Type: 'Human_Presence', instance: 'sm-1:9100' },
      values,
    };
    const { series: built } = build([raw]);
    expect(built[0]!.intervalsByDay['2026-08-14']).toHaveLength(1);
  });
});

/**
 * Union is opt-in, and this is why (Codex review, 2026-08-23).
 *
 * The union takes the highest value at each instant, which is only correct for
 * a BINARY signal — the highest of several yeses is still one yes. This
 * builder also serves counted signals, where two streams carrying two people
 * and three people mean five, not three. Defaulting it on would quietly
 * undercount exactly the chart it was not measured against.
 */
describe('combineSameKeyStreams', () => {
  const twoStreams = (): PrometheusRangeSeries[] => [
    series('Human_Presence', [
      ['2026-08-14T09:00:00', '2'],
      ['2026-08-14T10:00:00', '0'],
    ]),
    series('Human_Presence', [
      ['2026-08-14T09:00:00', '3'],
      ['2026-08-14T10:00:00', '0'],
    ]),
  ];

  it('leaves streams alone by default, so counted signals are never merged', () => {
    const { series: built } = build(twoStreams());
    expect(built).toHaveLength(2);
  });

  it('merges them only when the caller says the signal is binary', () => {
    const { series: built } = build(twoStreams(), { combineSameKeyStreams: true });
    expect(built).toHaveLength(1);
  });
});
