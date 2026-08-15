import { DateTime } from 'luxon';

import {
  buildOccupancyTimeline,
  dayLabel,
  hourTicks,
  intervalTooltip,
  positionInDay,
  type PrometheusRangeSeries,
} from '@/charts/occupancy-timeline';
import { FIXTURES, PEOPLE_IN_STALL, noData, overnight, partialToday, quietWeek, denseWeek, normalWeek, daylightSaving } from '@/charts/fixtures/people-in-stall';

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

  it('labels hours "h a", 12 AM through 12 AM', () => {
    const ticks = hourTicks(day, ZONE);

    expect(ticks).toHaveLength(25);
    expect(ticks[0]).toEqual({ label: '12 AM', position: 0 });
    expect(ticks[12]!.label).toBe('12 PM');
    expect(ticks[24]).toEqual({ label: '12 AM', position: 1 });
  });

  it('keeps clock time honest on the 23-hour spring-forward day', () => {
    // 2026-03-08 in Chicago: 2 AM does not exist. 3 AM is two hours after
    // midnight, not three, and must sit at 2/23 across the row.
    const dst = build([], { selectedDate: '2026-03-08', now: T('2026-03-09T09:00:00') }).days[6]!;

    expect(positionInDay(secs('2026-03-08T03:00:00'), dst, ZONE)).toBeCloseTo(2 / 23);
    const labels = hourTicks(dst, ZONE).map((t) => t.label);
    expect(labels).toHaveLength(24); // 23 hours + the closing midnight
    expect(labels).not.toContain('2 AM');
    expect(labels.slice(0, 4)).toEqual(['12 AM', '1 AM', '3 AM', '4 AM']);
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
