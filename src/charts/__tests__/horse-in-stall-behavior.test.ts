import { DateTime } from 'luxon';

import {
  absencesCaption,
  absencesFrom,
  buildHorseInStallWeek,
  MIN_ABSENCE_SECONDS,
  type HorseInStallDay,
} from '@/charts/horse-in-stall-behavior';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T18:00:00', { zone: ZONE });
const SELECTED = '2026-08-19';
const STEP = 60;

const ts = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toSeconds();

/**
 * A week of samples where the horse is IN except during the given ranges —
 * the inverse of the Lying Down fixture, because in-stall is the resting state.
 */
function series(outRanges: [string, string][]): PrometheusRangeSeries[] {
  const values: [number, string][] = [];
  const first = DateTime.fromISO('2026-08-13T00:00:00', { zone: ZONE });
  const ranges = outRanges.map(([from, to]) => [ts(from), ts(to)]);
  for (let t = first.toSeconds(); t <= NOW.toSeconds(); t += STEP) {
    const out = ranges.some(([from, to]) => t >= from! && t < to!);
    values.push([t, out ? '0' : '1']);
  }
  return [{ metric: { animal_type: 'horse', id: '0' }, values }];
}

const day = (overrides: Partial<HorseInStallDay> = {}): HorseInStallDay => ({
  totalSeconds: 18 * 3600,
  absences: [],
  partlyRecorded: false,
  ...overrides,
});

describe('absencesFrom', () => {
  const START = ts('2026-08-19T06:00:00');
  const UP_TO = ts('2026-08-19T18:00:00');

  it('reads the gap between two in-stall stretches as one absence', () => {
    const bouts = [
      { enter: START, exit: ts('2026-08-19T08:30:00') },
      { enter: ts('2026-08-19T13:05:00'), exit: UP_TO },
    ];
    expect(absencesFrom(bouts, START, UP_TO)).toEqual([
      { out: ts('2026-08-19T08:30:00'), back: ts('2026-08-19T13:05:00') },
    ]);
  });

  it('leaves an absence open while the horse is still out', () => {
    const bouts = [{ enter: START, exit: ts('2026-08-19T08:30:00') }];
    // `back: null` — not "back at 6 PM", which would be inventing a return.
    expect(absencesFrom(bouts, START, UP_TO)).toEqual([
      { out: ts('2026-08-19T08:30:00'), back: null },
    ]);
  });

  it('treats a whole day with no in-stall time as one open absence', () => {
    expect(absencesFrom([], START, UP_TO)).toEqual([{ out: START, back: null }]);
  });

  it('ignores a gap too short to be turnout', () => {
    // A missed scrape or a moment in the doorway is not an absence worth naming.
    const bouts = [
      { enter: START, exit: ts('2026-08-19T08:30:00') },
      { enter: ts('2026-08-19T08:30:00') + MIN_ABSENCE_SECONDS - 60, exit: UP_TO },
    ];
    expect(absencesFrom(bouts, START, UP_TO)).toEqual([]);
  });
});

describe('absencesCaption', () => {
  it('says the horse was in all day when it never left', () => {
    expect(absencesCaption(day(), ZONE)).toBe('In all day');
  });

  it('names a single finished absence with both ends', () => {
    const absences = [
      { out: ts('2026-08-19T08:30:00'), back: ts('2026-08-19T13:05:00') },
    ];
    expect(absencesCaption(day({ absences }), ZONE)).toBe('Out 8:30 AM – 1:05 PM');
  });

  it('joins two absences rather than counting them', () => {
    const absences = [
      { out: ts('2026-08-19T08:30:00'), back: ts('2026-08-19T13:05:00') },
      { out: ts('2026-08-19T16:20:00'), back: ts('2026-08-19T17:00:00') },
    ];
    expect(absencesCaption(day({ absences }), ZONE)).toBe(
      'Out 8:30 AM – 1:05 PM and 4:20 PM – 5:00 PM',
    );
  });

  it('counts them once there are too many to read', () => {
    const absences = [8, 11, 14, 16].map((hour) => ({
      out: ts(`2026-08-19T${String(hour).padStart(2, '0')}:00:00`),
      back: ts(`2026-08-19T${String(hour).padStart(2, '0')}:40:00`),
    }));
    expect(absencesCaption(day({ absences }), ZONE)).toBe(
      'Out 4 times · first 8:00 AM, last 4:00 PM',
    );
  });

  it('says the horse is still out rather than implying it came back', () => {
    const absences = [{ out: ts('2026-08-19T08:30:00'), back: null }];
    expect(absencesCaption(day({ absences }), ZONE)).toBe('Out since 8:30 AM');
  });

  it('distinguishes a horse out all day from one that never left', () => {
    const absences = [{ out: ts('2026-08-19T06:00:00'), back: null }];
    expect(absencesCaption(day({ totalSeconds: 0, absences }), ZONE)).toBe('Out all day');
  });

  /**
   * The two failures this chart exists to avoid, in caption form. A gap means
   * either "the horse was out" or "nobody was watching", and presenting the
   * second as the first is the shipping app's missing-data bug with a friendlier
   * face.
   */
  it('never claims to know where the horse was when nothing was observed', () => {
    expect(absencesCaption(day({ totalSeconds: null }), ZONE)).toBe(
      "We can't tell where the horse was",
    );
  });

  it('withholds the absence list on a partly recorded day', () => {
    expect(absencesCaption(day({ partlyRecorded: true }), ZONE)).toBe(
      'Partly recorded — time out is unknown',
    );
  });
});

describe('buildHorseInStallWeek', () => {
  it('reads turnout from the data as one absence', () => {
    const week = buildHorseInStallWeek({
      result: series([['2026-08-19T08:30:00', '2026-08-19T13:05:00']]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });
    expect(absencesCaption(week.today, ZONE)).toBe('Out 8:30 AM – 1:05 PM');
  });

  it('withholds a verdict until the entity is old enough to have a normal', () => {
    // Same rule as the other two behaviours: no history, no judgement.
    const week = buildHorseInStallWeek({
      result: series([]),
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
      entityCreatedAt: NOW.minus({ days: 2 }).toISO(),
    });
    expect(week.verdict).toBe('unknown');
  });

  it('suppresses absences when the monitor dropped out mid-day', () => {
    // Cut a four-hour hole in the samples. The horse may have been out, or the
    // camera may have been down; the chart must not pick one.
    const raw = series([])[0]!;
    const holeFrom = ts('2026-08-19T11:40:00');
    const holeTo = ts('2026-08-19T15:30:00');
    const week = buildHorseInStallWeek({
      result: [
        { ...raw, values: raw.values.filter(([t]) => t < holeFrom || t > holeTo) },
      ],
      selectedDate: SELECTED,
      zone: ZONE,
      now: NOW,
    });

    expect(week.today?.partlyRecorded).toBe(true);
    expect(week.today?.absences).toEqual([]);
    expect(absencesCaption(week.today, ZONE)).toBe('Partly recorded — time out is unknown');
  });
});
