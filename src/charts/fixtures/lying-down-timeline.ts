import { DateTime } from 'luxon';

import type { PrometheusRangeSeries } from '../occupancy-timeline';

/**
 * Fixtures for the Lying Down timeline — one per acceptance case in the brief
 * (§4), each built so its expected result can be stated independently.
 *
 * Samples every 30 s, matching the query's `[1m30s:30s]` step. Magnitudes echo
 * the real monitors: two to four rests a night, 14–189 minutes a day.
 */

const STEP = 30;

type Range = readonly [string, string];

/** A run of samples from `from` to `to`, 1 inside any `down` range. */
export function samples(
  zone: string,
  from: string,
  to: string,
  down: readonly Range[],
  { skip = [] as readonly Range[], id = '0' } = {},
): PrometheusRangeSeries {
  const at = (iso: string) => DateTime.fromISO(iso, { zone }).toSeconds();
  // Parse every boundary once. Parsing inside the loop cost ~600k DateTime
  // constructions for a week and timed the component tests out.
  const downS = down.map(([a, b]) => [at(a), at(b)] as const);
  const skipS = skip.map(([a, b]) => [at(a), at(b)] as const);
  const values: [number, string][] = [];
  for (let t = at(from), end = at(to); t <= end; t += STEP) {
    if (skipS.some(([a, b]) => t >= a && t < b)) continue;
    const isDown = downS.some(([a, b]) => t >= a && t < b);
    values.push([t, isDown ? '1' : '0']);
  }
  return { metric: { animal_type: 'horse', id }, values };
}

/** Case 1 — an ordinary night: two rests, fully observed. */
export function normalNight(zone: string): PrometheusRangeSeries[] {
  return [
    samples(zone, '2026-08-20T00:00:00', '2026-08-21T12:00:00', [
      ['2026-08-20T01:52:00', '2026-08-20T03:10:00'],
      ['2026-08-20T04:30:00', '2026-08-20T05:05:00'],
    ]),
  ];
}

/** Case 2 — positive on both sides of an outage: two bouts, a hole between. */
export function outageBetweenRests(zone: string): PrometheusRangeSeries[] {
  return [
    samples(
      zone,
      '2026-08-20T00:00:00',
      '2026-08-21T12:00:00',
      [['2026-08-20T01:00:00', '2026-08-20T06:00:00']],
      { skip: [['2026-08-20T02:00:00', '2026-08-20T05:00:00']] },
    ),
  ];
}

/** Case 3 — recording stops while the horse is still down. */
export function stopsWhileDown(zone: string): PrometheusRangeSeries[] {
  return [
    samples(zone, '2026-08-20T00:00:00', '2026-08-20T02:30:00', [
      ['2026-08-20T01:30:00', '2026-08-20T09:00:00'],
    ]),
  ];
}

/** Case 4 — one positive sample, and a bout ending exactly at 23:58:30. */
export function singleSampleAnd235830(zone: string): PrometheusRangeSeries[] {
  return [
    samples(zone, '2026-08-20T00:00:00', '2026-08-21T12:00:00', [
      ['2026-08-20T14:00:00', '2026-08-20T14:00:30'],
      ['2026-08-20T23:20:00', '2026-08-20T23:58:30'],
    ]),
  ];
}

/** Case 5 — two tracks of the same horse, never overlapping. */
export function twoTracksOneHorse(zone: string): PrometheusRangeSeries[] {
  return [
    samples(zone, '2026-08-20T00:00:00', '2026-08-21T12:00:00', [
      ['2026-08-20T01:00:00', '2026-08-20T02:00:00'],
    ]),
    samples(zone, '2026-08-20T00:00:00', '2026-08-21T12:00:00', [
      ['2026-08-20T04:00:00', '2026-08-20T05:00:00'],
    ], { id: '1' }),
  ];
}

/** Case 5b — two tracks reporting the SAME hour: one hour, not two. */
export function twoTracksOverlapping(zone: string): PrometheusRangeSeries[] {
  const range: Range[] = [['2026-08-20T01:00:00', '2026-08-20T02:00:00']];
  return [
    samples(zone, '2026-08-20T00:00:00', '2026-08-21T12:00:00', range),
    samples(zone, '2026-08-20T00:00:00', '2026-08-21T12:00:00', range, { id: '1' }),
  ];
}

/** Case 8 — nothing at all. */
export function noData(): PrometheusRangeSeries[] {
  return [];
}

/** Case 8b — observed all week, the horse never lay down. A real zero. */
export function observedNeverDown(zone: string): PrometheusRangeSeries[] {
  return [samples(zone, '2026-08-15T00:00:00', '2026-08-21T12:00:00', [])];
}

/**
 * The seven-day preview, built RELATIVE to `now` — rests most nights, an outage
 * four days ago, a single 30-second reading this morning.
 *
 * Relative on purpose: the first version was hard-dated and rendered as "No
 * readings" on a device whose clock had moved past the window, while the tests
 * — which pin `now` — stayed green. A preview fixture has to travel with the
 * clock or it silently stops previewing.
 *
 * Each entry: `[daysAgo, 'HH:mm', 'HH:mm']`; a range ending past 24:00 is
 * written on the following day.
 */
export function previewWeek(zone: string, now: DateTime): PrometheusRangeSeries[] {
  const day = (daysAgo: number) => now.setZone(zone).startOf('day').minus({ days: daysAgo });
  const iso = (daysAgo: number, hhmm: string) =>
    day(daysAgo).toFormat('yyyy-MM-dd') + 'T' + hhmm + ':00';
  const r = (daysAgo: number, a: string, b: string): Range => [iso(daysAgo, a), iso(daysAgo, b)];

  return [
    samples(
      zone,
      iso(6, '00:00'),
      now.setZone(zone).toFormat("yyyy-MM-dd'T'HH:mm:ss"),
      [
        r(6, '00:40', '02:30'), r(6, '04:20', '05:40'), r(6, '21:10', '22:50'),
        r(5, '01:00', '03:20'), r(5, '21:30', '22:45'),
        r(4, '00:30', '02:00'), r(4, '20:50', '22:40'),
        r(3, '00:50', '02:40'), r(3, '05:40', '06:20'), r(3, '21:20', '22:50'),
        r(2, '13:00', '14:10'), r(2, '21:00', '22:30'),
        r(1, '00:30', '02:30'), r(1, '21:00', '22:40'),
        r(0, '00:40', '02:20'),
        [iso(0, '03:20'), day(0).plus({ hours: 3, minutes: 20, seconds: 30 }).toFormat("yyyy-MM-dd'T'HH:mm:ss")],
      ],
      { skip: [r(4, '07:40', '13:40')] },
    ),
  ];
}
