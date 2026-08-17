import type { DateTime } from 'luxon';

import { BUFFER_OFFSET_SECONDS } from '@acme/config/constants/date-constants';

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
 * The latest instant the user may select.
 *
 * Live video runs behind real time, so "now" for the play-head is slightly in
 * the past; without the offset the scrubber can be dragged to an instant no
 * footage exists for yet.
 *
 * `BUFFER_OFFSET_SECONDS` is the SHARED constant (`SEGMENT_SIZE ×
 * LIVE_STREAM_OFFSET` = 6s), the same one the current app's play-head uses.
 * This file briefly declared its own `BUFFER_OFFSET_SECONDS = 30` — an
 * invented value that both disagreed with the real one and shadowed it by
 * name, which would have put the scrubber and the video player 24 seconds
 * apart about where "now" is the moment the player landed.
 */
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

/**
 * Live readings are asked for on a 5-minute grid, not at the exact instant.
 *
 * **This is what makes the metrics queries cacheable.** `useOrganizationNow`
 * ticks every minute and the cursor follows it, so feeding the raw cursor into
 * a query key minted a new key every 60 seconds: React Query saw a brand-new
 * query each minute and refetched immediately — roughly 180 requests an hour
 * instead of 18, with the `refetchInterval` meant to pace them never surviving
 * long enough to fire (review, 2026-08-17).
 *
 * Flooring onto a slice means the key only moves on a boundary, and that
 * movement *is* the refresh. Same 300s grid the camera frames already use in
 * `useHorses`, `useSnapshots` and `useHorseDetail`.
 *
 * 5 minutes of staleness is proportionate: the underlying PromQL is itself a
 * 90-second average, and the current app polls this every 10 minutes.
 */
export const LIVE_SLICE_SECONDS = 300;

export function liveSliceFor(cursor: DateTime): number {
  return Math.floor(cursor.toSeconds() / LIVE_SLICE_SECONDS) * LIVE_SLICE_SECONDS;
}

/** "Today", "Yesterday", or a written date — never a bare number. */
export function dayLabel(day: DateTime, now: DateTime): string {
  if (isToday(day, now)) return 'Today';
  if (day.hasSame(now.minus({ days: 1 }), 'day')) return 'Yesterday';
  return day.toFormat(day.hasSame(now, 'year') ? 'ccc d LLL' : 'ccc d LLL yyyy');
}
