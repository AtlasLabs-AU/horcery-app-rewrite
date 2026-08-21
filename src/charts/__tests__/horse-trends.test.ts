import { DateTime } from 'luxon';

import {
  buildActivenessDay,
  buildRollingWeek,
  rollingCaption,
  type RollingEvent,
} from '@/charts/horse-trends';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-21T15:00:00', { zone: ZONE });

const at = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toSeconds();

describe('buildActivenessDay', () => {
  const minuteSamples = (from: string, to: string): [number, string][] => {
    const out: [number, string][] = [];
    for (let t = at(from); t <= at(to); t += 60) out.push([t, String(Math.sin(t / 900) + 1)]);
    return out;
  };

  it('keeps the raw values — no ×1000, no invented unit', () => {
    const day = buildActivenessDay({
      samples: [[NOW.toSeconds() - 600, '0.42']],
      now: NOW,
    });
    expect(day.points[0]!.value).toBe(0.42);
  });

  it('breaks the line where the monitor was silent instead of bridging it', () => {
    const samples = [
      ...minuteSamples('2026-08-20T15:00:00', '2026-08-20T20:00:00'),
      ...minuteSamples('2026-08-21T02:00:00', '2026-08-21T15:00:00'),
    ];
    const day = buildActivenessDay({ samples, now: NOW });
    expect(day.gaps).toHaveLength(1);
    expect(day.gaps[0]!.from).toBe(at('2026-08-20T20:00:00'));
    expect(day.gaps[0]!.to).toBe(at('2026-08-21T02:00:00'));
  });

  it('reports no data rather than an empty line', () => {
    expect(buildActivenessDay({ samples: [], now: NOW }).state).toBe('no-data');
  });
});

describe('buildRollingWeek', () => {
  const event = (iso: string, kind: RollingEvent['kind'] = 'rolling'): RollingEvent => ({
    at: at(iso),
    kind,
  });
  const week = (
    events: RollingEvent[],
    observed: string[],
    previousEvents: RollingEvent[] = [],
  ) =>
    buildRollingWeek({
      events,
      previousEvents,
      observedDays: new Set(observed),
      zone: ZONE,
      now: NOW,
    });

  const ALL_OBSERVED = [
    '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
  ];

  it('counts events into barn days from their exact timestamps', () => {
    // 3 AM on the 21st belongs to the barn day that began 6 AM on the 20th.
    const built = week(
      [event('2026-08-20T09:00:00'), event('2026-08-21T03:00:00')],
      ALL_OBSERVED,
    );
    expect(built.days.find((d) => d.key === '2026-08-20')!.count).toBe(2);
    expect(built.days.find((d) => d.key === '2026-08-21')!.count).toBe(0);
  });

  it('keeps an unobserved day null — an empty slot, never a zero bar', () => {
    const built = week([], ALL_OBSERVED.filter((key) => key !== '2026-08-17'));
    expect(built.days.find((d) => d.key === '2026-08-17')!.count).toBeNull();
    // And a day the monitor watched with no rolls is a REAL zero.
    expect(built.days.find((d) => d.key === '2026-08-18')!.count).toBe(0);
  });

  it('takes last week from its own events, never by shifting dates', () => {
    const built = week([], ALL_OBSERVED, [
      event('2026-08-13T10:00:00'),
      event('2026-08-13T16:00:00'),
    ]);
    // The 13th is seven days before the 20th, so the marker lands there.
    expect(built.days.find((d) => d.key === '2026-08-20')!.previousCount).toBe(2);
    expect(built.days.find((d) => d.key === '2026-08-19')!.previousCount).toBeNull();
  });

  it('marks today, which a renderer must draw hollow', () => {
    const built = week([], ALL_OBSERVED);
    expect(built.days.at(-1)!.key).toBe('2026-08-21');
    expect(built.days.at(-1)!.isToday).toBe(true);
  });
});

describe('rollingCaption', () => {
  const event = (iso: string): RollingEvent => ({ at: at(iso), kind: 'rolling' });

  it('lists exact times, never hour buckets', () => {
    expect(
      rollingCaption(
        [event('2026-08-21T07:14:00'), event('2026-08-21T09:02:00'), event('2026-08-21T13:40:00')],
        ZONE,
      ),
    ).toBe('Rolled 3 times · 7:14 AM, 9:02 AM, 1:40 PM');
  });

  it('summarises a busy day rather than overflowing', () => {
    const events = [7, 9, 11, 13, 15].map((h) => event(`2026-08-21T${String(h).padStart(2, '0')}:00:00`));
    expect(rollingCaption(events, ZONE)).toBe('Rolled 5 times · first 7:00 AM, last 3:00 PM');
  });

  it('says so plainly when nothing was detected', () => {
    expect(rollingCaption([], ZONE)).toBe('No rolling detected');
  });
});
