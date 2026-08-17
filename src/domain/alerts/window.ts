/**
 * The alert evaluation window — barn time in, UTC `HH:MM:SS` out, and back.
 *
 * WHY THIS EXISTS. The API stores `evaluation_start_time` / `_end_time` as a
 * bare UTC clock time with no date and no zone, and the backend evaluates
 * that fixed UTC time. The shipping app converts from the DEVICE's zone.
 * Two failures follow: a phone in a different zone from the barn stores a
 * window that is wrong for the barn (and looks right on the phone); and a
 * fixed UTC time is a DIFFERENT barn time after a clock change (DST).
 *
 * WHAT WE FIX HERE. Device≠barn: fully — every conversion uses the
 * organization's IANA zone, never the device's. DST: we cannot change what
 * the backend evaluates, so we make drift VISIBLE and one-tap fixable — the
 * metadata block written on save (`WindowMetadata`) records the barn-local
 * times and the offset in force; `detectDrift` compares that with today.
 *
 * Every function is pure. `on` is the instant "now" for the caller; tests
 * pass fixed instants (a summer date and a winter date per zone).
 *
 * Architecture §7; plan §3.4.
 */

import { DateTime, IANAZone } from 'luxon';

import type { AlertWindow, ClockTime, Drift, WindowMetadata } from './types';

/** "Any time" is stored as the whole barn day. */
const ANY_START: ClockTime = { hour: 0, minute: 0 };
const ANY_END: ClockTime = { hour: 23, minute: 59 };

// ------------------------------------------------------------ zone

/**
 * Resolve the barn zone. Falls back to the device zone when the organization
 * has none or it is not a valid IANA name — and SAYS SO via `fallback`, so
 * the UI can show "Barn timezone not set — using your phone's".
 */
export function resolveZone(organizationZone: string | null | undefined): {
  zone: string;
  fallback: boolean;
} {
  if (organizationZone && IANAZone.isValidZone(organizationZone)) {
    return { zone: organizationZone, fallback: false };
  }
  return { zone: DateTime.local().zoneName ?? 'UTC', fallback: true };
}

/** UTC offset in minutes for `zone` at instant `on`. */
export function offsetMinutes(zone: string, on: DateTime): number {
  return on.setZone(zone).offset;
}

// ------------------------------------------------------------ codec

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `HH:MM:SS` from a clock time. */
export function toHMS(t: ClockTime, seconds = 0): string {
  return `${pad2(t.hour)}:${pad2(t.minute)}:${pad2(seconds)}`;
}

/** `HH:MM` from a clock time (metadata form). */
export function toHM(t: ClockTime): string {
  return `${pad2(t.hour)}:${pad2(t.minute)}`;
}

/** Parse `HH:MM` or `HH:MM:SS`; null when malformed. */
export function parseClock(text: string | null | undefined): ClockTime | null {
  if (!text) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * Barn-local clock time on the calendar day of `on` in `zone` → the same
 * instant expressed as a UTC clock time. Overnight windows are legal: the
 * caller stores start and end independently and the backend wraps.
 */
export function localToUtcClock(t: ClockTime, zone: string, on: DateTime): ClockTime {
  const local = on.setZone(zone).set({ hour: t.hour, minute: t.minute, second: 0, millisecond: 0 });
  const utc = local.toUTC();
  return { hour: utc.hour, minute: utc.minute };
}

/** The reverse of `localToUtcClock`. */
export function utcToLocalClock(t: ClockTime, zone: string, on: DateTime): ClockTime {
  const utc = on.toUTC().set({ hour: t.hour, minute: t.minute, second: 0, millisecond: 0 });
  const local = utc.setZone(zone);
  return { hour: local.hour, minute: local.minute };
}

/**
 * The API pair for a window. `mode: 'any'` stores the whole BARN day
 * (00:00–23:59 barn time), which in UTC almost always wraps midnight — that
 * is expected; the shipping app produced the same shape from device time.
 */
export function toStorage(
  window: AlertWindow,
  on: DateTime,
): { start: string; end: string } {
  const startLocal = window.mode === 'any' ? ANY_START : (window.start ?? ANY_START);
  const endLocal = window.mode === 'any' ? ANY_END : (window.end ?? ANY_END);
  const start = localToUtcClock(startLocal, window.zone, on);
  const end = localToUtcClock(endLocal, window.zone, on);
  // Preserve the shipping app's ":59" second on an any-time end so the pair
  // still reads as a whole day to whatever the backend does with it.
  return {
    start: toHMS(start, 0),
    end: toHMS(end, window.mode === 'any' ? 59 : 0),
  };
}

/**
 * The barn-time window for a stored pair. Recognises "any time" when the
 * pair, converted back, spans the barn day (±1 minute).
 */
export function fromStorage(
  start: string | null | undefined,
  end: string | null | undefined,
  zone: string,
  on: DateTime,
  zoneFallback = false,
): AlertWindow {
  const s = parseClock(start);
  const e = parseClock(end);
  if (!s || !e) {
    return { mode: 'any', zone, zoneFallback };
  }
  const startLocal = utcToLocalClock(s, zone, on);
  const endLocal = utcToLocalClock(e, zone, on);
  if (isWholeDay(startLocal, endLocal)) {
    return { mode: 'any', zone, zoneFallback };
  }
  return { mode: 'custom', start: startLocal, end: endLocal, zone, zoneFallback };
}

function clockMinutes(t: ClockTime): number {
  return t.hour * 60 + t.minute;
}

/**
 * A window that covers the whole day IS "any time" wherever it starts:
 * 00:00 → 23:59, but also 19:00 → 18:59 — which is exactly what an old-app
 * rule stored as 00:00–23:59 UTC reads as in Chicago (found on device,
 * A2). Length-based, with a minute of slack for the `:59` second.
 */
function isWholeDay(start: ClockTime, end: ClockTime): boolean {
  let diff = clockMinutes(end) - clockMinutes(start);
  if (diff < 0) diff += 24 * 60;
  return diff >= 24 * 60 - 2;
}

/** True when the window is (or reads as) the whole barn day. */
export function isAnyTime(window: AlertWindow): boolean {
  if (window.mode === 'any') return true;
  if (!window.start || !window.end) return true;
  return isWholeDay(window.start, window.end);
}

/**
 * Length of the window in minutes. Overnight windows (end before start on
 * the clock) wrap: 21:00 → 06:00 is 540, exactly as the shipping app counts.
 */
export function windowMinutes(window: AlertWindow): number {
  if (isAnyTime(window)) return 24 * 60;
  const s = clockMinutes(window.start!);
  const e = clockMinutes(window.end!);
  let diff = e - s;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// ------------------------------------------------------------ metadata + drift

/** The block written into `UNATTESTED_META_DATA.window` on save. */
export function buildWindowMetadata(window: AlertWindow, on: DateTime): WindowMetadata {
  const startLocal = window.mode === 'any' ? ANY_START : (window.start ?? ANY_START);
  const endLocal = window.mode === 'any' ? ANY_END : (window.end ?? ANY_END);
  return {
    zone: window.zone,
    start_local: toHM(startLocal),
    end_local: toHM(endLocal),
    saved_offset_min: offsetMinutes(window.zone, on),
    saved_at: on.toUTC().toISO() ?? '',
  };
}

/** Read the block back; null when absent or malformed. */
export function readWindowMetadata(meta: unknown): WindowMetadata | null {
  if (!meta || typeof meta !== 'object') return null;
  const w = (meta as { window?: unknown }).window;
  if (!w || typeof w !== 'object') return null;
  const m = w as Partial<WindowMetadata>;
  if (
    typeof m.zone !== 'string' ||
    typeof m.start_local !== 'string' ||
    typeof m.end_local !== 'string' ||
    typeof m.saved_offset_min !== 'number'
  ) {
    return null;
  }
  return {
    zone: m.zone,
    start_local: m.start_local,
    end_local: m.end_local,
    saved_offset_min: m.saved_offset_min,
    saved_at: typeof m.saved_at === 'string' ? m.saved_at : '',
  };
}

/**
 * Has the stored UTC window stopped meaning what the user set?
 * - `zone`  : the organization's timezone changed since save.
 * - `offset`: same zone, different offset now (a clock change) — the barn
 *             window has moved by `minutes`.
 * `null` when the metadata is absent (rules saved by the old app — we do not
 * claim what we cannot know) or when nothing has moved.
 */
export function detectDrift(
  meta: WindowMetadata | null,
  currentZone: string,
  on: DateTime,
): Drift | null {
  if (!meta) return null;
  if (meta.zone !== currentZone) {
    return { kind: 'zone', from: meta.zone, to: currentZone };
  }
  const now = offsetMinutes(currentZone, on);
  if (now !== meta.saved_offset_min) {
    return { kind: 'offset', minutes: now - meta.saved_offset_min };
  }
  return null;
}

/**
 * The window the user MEANT, from metadata — preferred over `fromStorage`
 * when present because it is exact regardless of drift.
 */
export function windowFromMetadata(
  meta: WindowMetadata,
  zoneFallback = false,
): AlertWindow | null {
  const start = parseClock(meta.start_local);
  const end = parseClock(meta.end_local);
  if (!start || !end) return null;
  if (isWholeDay(start, end)) return { mode: 'any', zone: meta.zone, zoneFallback };
  return { mode: 'custom', start, end, zone: meta.zone, zoneFallback };
}
