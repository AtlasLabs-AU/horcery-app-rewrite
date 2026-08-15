import { DateTime } from 'luxon';

import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

/**
 * People In Stall fixtures — the data both §6a spikes render.
 *
 * Shaped EXACTLY like the current app's Prometheus response for the
 * `HUMAN_IN_STALL_DETECTION_QUERY` range query: two series distinguished by
 * `Event_Type` (`Human_Interaction` = with horse, `Human_Presence` = without),
 * one sample every 90 seconds across seven days, values as strings.
 *
 * Synthetic and DETERMINISTIC (seeded), so every renderer, every device and
 * every CI run sees byte-identical input. Realistic in shape — visits cluster
 * around feeding and turnout, the two series are mutually exclusive at any
 * instant (the PromQL guarantees this: a person is either with the horse or
 * not) — but not real customer data. Capturing one anonymised real response to
 * sit beside these is an open item in PEOPLE_IN_STALL.md.
 *
 * Every fixture names the scenario it exists to exercise. If you add one, say
 * what it stresses that the others do not.
 */

export const PEOPLE_IN_STALL = {
  /** Fixed so fixtures never drift with the calendar. */
  zone: 'America/Chicago',
  step: 90,
  threshold: 0.2,
  series: {
    withHorse: 'Human_Interaction',
    withoutHorse: 'Human_Presence',
  },
} as const;

export interface Fixture {
  name: string;
  /** What this scenario stresses. */
  purpose: string;
  zone: string;
  /** ISO date of the last (bottom) row. */
  selectedDate: string;
  /** ISO datetime — the frozen "now" the fixture was built for. */
  now: string;
  result: PrometheusRangeSeries[];
}

/** mulberry32 — tiny seeded PRNG so fixtures are reproducible without a dependency. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Visit {
  /** Seconds since local midnight. */
  start: number;
  /** Duration in seconds. */
  duration: number;
  /** People present. */
  count: number;
  withHorse: boolean;
}

/** A day's visits, as (local-time) segments. Overlaps are resolved last-wins. */
type DayPlan = (dayIndex: number, rand: () => number) => Visit[];

const MIN = 60;
const HOUR = 3600;

/**
 * Turns day plans into the two Prometheus series by sampling every `step`
 * seconds — exactly how the real data arrives.
 */
function sample(
  plans: DayPlan[],
  options: { zone: string; selectedDate: string; now: string; seed: number },
): PrometheusRangeSeries[] {
  const { zone, seed } = options;
  const rand = seeded(seed);
  const now = DateTime.fromISO(options.now, { zone });
  const selected = DateTime.fromISO(options.selectedDate, { zone }).startOf('day');
  const dayCount = plans.length;

  const withHorse: [number, string][] = [];
  const withoutHorse: [number, string][] = [];

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const dayStart = selected.minus({ days: dayCount - 1 - dayIndex });
    const dayEnd = dayStart.plus({ days: 1 });
    const visits = plans[dayIndex]!(dayIndex, rand);
    const daySeconds = dayEnd.toSeconds() - dayStart.toSeconds();

    for (let offset = 0; offset < daySeconds; offset += PEOPLE_IN_STALL.step) {
      const t = dayStart.toSeconds() + offset;
      // The real query's `end` is end-of-day + 1s; samples past `now` do not
      // exist yet, so the last day is naturally shorter.
      if (t > now.toSeconds()) break;

      let interaction = 0;
      let presence = 0;
      for (const visit of visits) {
        if (offset >= visit.start && offset < visit.start + visit.duration) {
          if (visit.withHorse) {
            interaction = visit.count;
            presence = 0;
          } else {
            presence = visit.count;
            interaction = 0;
          }
        }
      }
      withHorse.push([t, String(interaction)]);
      withoutHorse.push([t, String(presence)]);
    }
  }

  const metric = (eventType: string) => ({
    Event_Type: eventType,
    instance: 'sm-4821:9100',
    job: 'stall-monitor',
  });

  return [
    { metric: metric(PEOPLE_IN_STALL.series.withHorse), values: withHorse },
    { metric: metric(PEOPLE_IN_STALL.series.withoutHorse), values: withoutHorse },
  ];
}

// ---- Day plans -------------------------------------------------------------

/** A typical barn day: morning feed, midday check, evening feed, odd extras. */
const typicalDay: DayPlan = (_dayIndex, rand) => {
  const jitter = (spread: number) => (rand() - 0.5) * 2 * spread;
  const visits: Visit[] = [
    { start: 6.5 * HOUR + jitter(30 * MIN), duration: 25 * MIN + jitter(10 * MIN), count: 1, withHorse: true },
    { start: 7.25 * HOUR + jitter(20 * MIN), duration: 8 * MIN + jitter(4 * MIN), count: 1, withHorse: false },
    { start: 12 * HOUR + jitter(45 * MIN), duration: 6 * MIN + jitter(3 * MIN), count: 1, withHorse: true },
    { start: 17 * HOUR + jitter(40 * MIN), duration: 35 * MIN + jitter(12 * MIN), count: rand() < 0.3 ? 2 : 1, withHorse: true },
    { start: 20.5 * HOUR + jitter(30 * MIN), duration: 5 * MIN + jitter(2 * MIN), count: 1, withHorse: false },
  ];
  // Some days have a farrier / vet visit — several people, longer.
  if (rand() < 0.35) {
    visits.push({ start: 10 * HOUR + jitter(90 * MIN), duration: 50 * MIN + jitter(15 * MIN), count: 3, withHorse: true });
  }
  return visits.map((v) => ({ ...v, start: Math.max(0, v.start), duration: Math.max(2 * MIN, v.duration) }));
};

/** Nothing at all — the "No Data Available" state is a query with no result, but an all-zero week is a different, valid picture. */
const emptyDay: DayPlan = () => [];

/** Stress: dozens of short visits, some back-to-back — many small bars. */
const denseDay: DayPlan = (_dayIndex, rand) => {
  const visits: Visit[] = [];
  let cursor = 5 * HOUR;
  while (cursor < 22 * HOUR) {
    const duration = (2 + rand() * 12) * MIN;
    visits.push({
      start: cursor,
      duration,
      count: rand() < 0.15 ? 2 : 1,
      withHorse: rand() < 0.6,
    });
    cursor += duration + (1 + rand() * 20) * MIN;
  }
  return visits;
};

/**
 * The theoretical ceiling. With a 90 s step there are 960 samples a day; a
 * value that flips on every sample yields a one-sample bar at every other one.
 * Two mutually exclusive series alternating with each other fill EVERY sample:
 * 960 bars per day, 6 720 across the week. No barn is this noisy — but a flaky
 * detector could be, and a renderer that is fine at 374 bars can fall apart at
 * 6 000. This is where that shows.
 */
const worstCaseDay: DayPlan = () => {
  const visits: Visit[] = [];
  const step = PEOPLE_IN_STALL.step;
  // Every sample is occupied; series alternates each sample.
  for (let offset = 0, i = 0; offset < 25 * HOUR; offset += step, i++) {
    visits.push({ start: offset, duration: step, count: 1, withHorse: i % 2 === 0 });
  }
  return visits;
};

/** A visit that runs across midnight into the next day — one bar becomes two rows. */
const overnightPair: [DayPlan, DayPlan] = [
  (_i, rand) => [...typicalDay(_i, rand), { start: 23 * HOUR + 20 * MIN, duration: 2 * HOUR, count: 1, withHorse: true }],
  (_i, rand) => [{ start: 0, duration: 40 * MIN, count: 1, withHorse: true }, ...typicalDay(_i, rand)],
];

// ---- Fixtures ----------------------------------------------------------------

const WEEK_END = '2026-08-14';
const AFTER_WEEK = '2026-08-15T09:00:00';

export const normalWeek: Fixture = {
  name: 'normal-week',
  purpose: 'A typical week — the picture most customers see. Baseline for smoothness and parity.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: AFTER_WEEK,
  result: sample(Array(7).fill(typicalDay), {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: WEEK_END,
    now: AFTER_WEEK,
    seed: 1,
  }),
};

export const denseWeek: Fixture = {
  name: 'dense-week',
  purpose: 'Stress — hundreds of small bars. Where a renderer drops frames on zoom and pan, if it is going to.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: AFTER_WEEK,
  result: sample(Array(7).fill(denseDay), {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: WEEK_END,
    now: AFTER_WEEK,
    seed: 2,
  }),
};

export const quietWeek: Fixture = {
  name: 'quiet-week',
  purpose: 'All-zero samples: a valid response with nothing above threshold. Must render seven empty rows, NOT "No Data Available".',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: AFTER_WEEK,
  result: sample(Array(7).fill(emptyDay), {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: WEEK_END,
    now: AFTER_WEEK,
    seed: 3,
  }),
};

export const noData: Fixture = {
  name: 'no-data',
  purpose: 'Empty result set — the real "No Data Available" state (a stall with no monitor history).',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: AFTER_WEEK,
  result: [],
};

export const partialToday: Fixture = {
  name: 'partial-today',
  purpose: 'Selected date is today at 14:20 with someone in the stall right now: the bottom row must stop at "now", and the open bar must reach it.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: '2026-08-14T14:20:00',
  result: sample(
    [
      ...Array(6).fill(typicalDay),
      () => [{ start: 6.5 * HOUR, duration: 20 * MIN, count: 1, withHorse: true }, { start: 14 * HOUR, duration: 3 * HOUR, count: 2, withHorse: true }],
    ],
    { zone: PEOPLE_IN_STALL.zone, selectedDate: WEEK_END, now: '2026-08-14T14:20:00', seed: 4 },
  ),
};

export const overnight: Fixture = {
  name: 'overnight',
  purpose: 'A visit crossing midnight — must show as a bar to the right edge of one row and from the left edge of the next.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: AFTER_WEEK,
  result: sample([...Array(5).fill(typicalDay), ...overnightPair], {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: WEEK_END,
    now: AFTER_WEEK,
    seed: 5,
  }),
};

export const daylightSaving: Fixture = {
  name: 'daylight-saving',
  purpose: 'The week containing the US spring-forward (2026-03-08, a 23-hour day). Bars after 2 AM that day must land at the right clock hour.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: '2026-03-10',
  now: '2026-03-11T09:00:00',
  result: sample(Array(7).fill(typicalDay), {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: '2026-03-10',
    now: '2026-03-11T09:00:00',
    seed: 6,
  }),
};

export const daylightSavingFallBack: Fixture = {
  name: 'daylight-saving-fall-back',
  purpose: 'The week containing the US fall-back (2026-11-01, a 25-hour day). Two different "1 AM" hours: the row must be 25/24 as long in time, bars must sit at the right instant, and the hour labels expose an ambiguity the renderer has to live with.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: '2026-11-03',
  now: '2026-11-04T09:00:00',
  result: sample(Array(7).fill(typicalDay), {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: '2026-11-03',
    now: '2026-11-04T09:00:00',
    seed: 7,
  }),
};

export const worstCase: Fixture = {
  name: 'worst-case',
  purpose: 'The theoretical ceiling — every 90 s sample occupied, series alternating: 6 720 one-sample bars in a week. Not realistic; a flaky detector could approach it. Where a renderer that copes with hundreds of bars breaks at thousands.',
  zone: PEOPLE_IN_STALL.zone,
  selectedDate: WEEK_END,
  now: AFTER_WEEK,
  result: sample(Array(7).fill(worstCaseDay), {
    zone: PEOPLE_IN_STALL.zone,
    selectedDate: WEEK_END,
    now: AFTER_WEEK,
    seed: 8,
  }),
};

/**
 * OBSERVED-HEAVY — deliberately absent.
 *
 * The third load in the spike plan is a real anonymised QA response from a
 * busy stall. It cannot be synthesised: it is the only fixture that can reveal
 * missing or irregular samples, unexpected series or metric labels, and the
 * bar counts a real barn actually produces. Capturing it does not block
 * building the two renderers; it DOES block the final renderer decision. See
 * PEOPLE_IN_STALL.md §11.
 */

export const FIXTURES: Fixture[] = [
  normalWeek,
  denseWeek,
  quietWeek,
  noData,
  partialToday,
  overnight,
  daylightSaving,
  daylightSavingFallBack,
  worstCase,
];
