import { DateTime } from 'luxon';

const DAY_KEY = 'yyyy-MM-dd';

function startParts(dayStartHour: number): { hour: number; minute: number } {
  if (!Number.isFinite(dayStartHour) || dayStartHour < 0 || dayStartHour >= 24) {
    throw new RangeError(`dayStartHour must be 0 to <24, got ${dayStartHour}`);
  }

  const totalMinutes = Math.round(dayStartHour * 60);
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

/** Places a configured barn-day start on a local calendar date. */
export function barnDayStartForDate(date: DateTime, dayStartHour: number): DateTime {
  const { hour, minute } = startParts(dayStartHour);
  return date.startOf('day').set({ hour, minute, second: 0, millisecond: 0 });
}

/** Returns the local calendar date whose barn day contains this instant. */
export function barnDayKeyForInstant(at: DateTime, dayStartHour: number): string {
  const boundary = barnDayStartForDate(at, dayStartHour);
  return (at < boundary ? at.minus({ days: 1 }) : at).toFormat(DAY_KEY);
}

/**
 * Five clock labels at the same fractions used by a barn-day chart's x-axis.
 *
 * A daylight-saving transition makes a real barn day 23 or 25 elapsed hours.
 * Deriving labels from a nominal start hour would either print the wrong end
 * time or place a correct-looking clock time over the wrong point in the data.
 * These labels follow the actual zoned span, so text and geometry stay aligned.
 */
export function barnDayAxisLabels(
  startSeconds: number,
  endSeconds: number,
  zone: string,
): string[] {
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
    return [];
  }

  const span = endSeconds - startSeconds;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) =>
    DateTime.fromSeconds(startSeconds + span * fraction, { zone }),
  );
  const format = ticks.some((tick) => tick.minute !== 0) ? 'h:mm a' : 'h a';
  return ticks.map((tick) => tick.toFormat(format));
}
