import type { DateTime } from 'luxon';

/**
 * The play-head: which day you are looking at, and the instant within it.
 *
 * Ported from the current app's `play-head-state-slice`, with two changes:
 *
 * 1. It is **pure**, and `now` is always an argument. The original is a global
 *    zustand slice shared with Stall Details, so state leaks between the two
 *    pages, and several of its consumers capture `DateTime.now()` once.
 * 2. Clamping is expressed once, here, rather than repeated in `setDate`,
 *    `setTimeOfDay` and `setCursor` — where the original quietly clamps three
 *    slightly different ways.
 */

/**
 * Live video runs behind real time, so "now" for the player is a little in the
 * past. The current app uses the same offset for the same reason; without it
 * the scrubber can be dragged to an instant no footage exists for yet.
 */
export const BUFFER_OFFSET_SECONDS = 30;

/** The latest instant the user may select. */
export function latestSelectable(now: DateTime): DateTime {
  return now.minus({ seconds: BUFFER_OFFSET_SECONDS });
}

/**
 * A day the user may look at: not before the horse existed, not after today.
 *
 * `earliest` is the horse's creation date — the current app passes this as the
 * date picker's minimum, so you cannot page back into days where the horse was
 * not yet in the system and everything is empty for an uninteresting reason.
 */
export function clampDay(day: DateTime, now: DateTime, earliest?: DateTime): DateTime {
  const today = latestSelectable(now).startOf('day');
  let clamped = day.startOf('day');
  if (clamped > today) clamped = today;
  if (earliest) {
    const floor = earliest.setZone(day.zone).startOf('day');
    if (clamped < floor) clamped = floor;
  }
  return clamped;
}

/**
 * The instant to read metrics at.
 *
 * On today, that is live now (minus the buffer) so a reading is current. On
 * any earlier day it is the end of that day, which is what the current app
 * effectively asks for and what makes "what was happening on Tuesday" work.
 */
export function cursorFor(day: DateTime, now: DateTime): DateTime {
  const latest = latestSelectable(now);
  if (day.hasSame(latest, 'day')) return latest;
  const endOfDay = day.endOf('day');
  return endOfDay > latest ? latest : endOfDay;
}

/** Is the selected day the organization's today? */
export function isToday(day: DateTime, now: DateTime): boolean {
  return day.hasSame(now, 'day');
}

/** Can the user step forward a day without passing today? */
export function canGoForward(day: DateTime, now: DateTime): boolean {
  return day.startOf('day') < latestSelectable(now).startOf('day');
}

/** Can the user step back without passing the horse's first day? */
export function canGoBack(day: DateTime, earliest?: DateTime): boolean {
  if (!earliest) return true;
  return day.startOf('day') > earliest.setZone(day.zone).startOf('day');
}

/** "Today", "Yesterday", or a written date — never a bare number. */
export function dayLabel(day: DateTime, now: DateTime): string {
  if (isToday(day, now)) return 'Today';
  if (day.hasSame(now.minus({ days: 1 }), 'day')) return 'Yesterday';
  return day.toFormat(day.hasSame(now, 'year') ? 'ccc d LLL' : 'ccc d LLL yyyy');
}
