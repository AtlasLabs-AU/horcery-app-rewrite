import type { DateTime } from 'luxon';

import type { RollingEvent } from '../horse-trends';

/**
 * Fixtures for Horse Trends. Activeness values sit in the raw query range
 * (roughly 0–2 after the deriv pipeline) with NO scaling — the ×1000 stays in
 * the legacy app. Rolling volumes match Review History's real densities: a few
 * events a day, partial-rolling more common than full rolls.
 */

/** A day of activeness: calm overnight, busy morning, a quiet afternoon. */
export function activenessDay(now: DateTime): [number, string][] {
  const out: [number, string][] = [];
  const start = now.minus({ hours: 24 });
  for (let t = start.toSeconds(); t <= now.toSeconds(); t += 300) {
    const hour = (t - start.toSeconds()) / 3600;
    const overnight = hour < 4 ? 0.15 : 0;
    const morning = hour >= 15 && hour < 19 ? 0.9 : 0;
    const wobble = 0.12 * Math.abs(Math.sin(t / 1800));
    out.push([t, (0.25 + overnight + morning + wobble).toFixed(3)]);
  }
  return out;
}

/** The same day with the monitor silent over lunch — the line must break. */
export function activenessWithGap(now: DateTime): [number, string][] {
  const gapFrom = now.minus({ hours: 7 }).toSeconds();
  const gapTo = now.minus({ hours: 4 }).toSeconds();
  return activenessDay(now).filter(([t]) => t < gapFrom || t > gapTo);
}

const eventAt = (
  now: DateTime,
  daysAgo: number,
  hour: number,
  kind: RollingEvent['kind'],
): RollingEvent => ({
  at: now.minus({ days: daysAgo }).startOf('day').plus({ hours: hour }).toSeconds(),
  kind,
});

/** A normal week: one or two partial rolls most days, a full roll twice. */
export function rollingWeek(now: DateTime): RollingEvent[] {
  return [
    eventAt(now, 6, 10, 'partial-rolling'),
    eventAt(now, 5, 8, 'partial-rolling'),
    eventAt(now, 5, 14, 'rolling'),
    eventAt(now, 4, 11, 'partial-rolling'),
    eventAt(now, 2, 9, 'partial-rolling'),
    eventAt(now, 2, 16, 'partial-rolling'),
    eventAt(now, 1, 13, 'rolling'),
    eventAt(now, 0, 7.2, 'rolling'),
    eventAt(now, 0, 9.05, 'partial-rolling'),
  ];
}

/** Last week's events, real timestamps — for the markers. */
export function rollingPreviousWeek(now: DateTime): RollingEvent[] {
  return [
    eventAt(now, 13, 9, 'partial-rolling'),
    eventAt(now, 12, 10, 'partial-rolling'),
    eventAt(now, 12, 15, 'rolling'),
    eventAt(now, 10, 8, 'partial-rolling'),
    eventAt(now, 9, 12, 'partial-rolling'),
    eventAt(now, 8, 11, 'rolling'),
    eventAt(now, 7, 16, 'partial-rolling'),
  ];
}

/** Barn-day keys the monitor reported this week; one day deliberately missing. */
export function observedDaysWithOutage(now: DateTime, dayStartHour: number): Set<string> {
  const keys = new Set<string>();
  for (let offset = 6; offset >= 0; offset--) {
    if (offset === 3) continue;
    keys.add(
      now
        .minus({ days: offset, hours: dayStartHour })
        .toFormat('yyyy-MM-dd'),
    );
  }
  return keys;
}
