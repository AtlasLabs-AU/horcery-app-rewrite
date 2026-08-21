import type { DateTime } from 'luxon';

/**
 * Last 24 Hours — how the horse spent the 24 hours ending at the selected time.
 *
 * Customer question (Inakshi, 2026-08-21, "Option B"): one flat band whose
 * segments visibly make one whole, with the exact durations listed beneath it.
 * The shipping app's donut-plus-progress-bars could show 25 hours in a
 * 24-hour day because each figure was rounded and drawn independently; this
 * model exists so that contradiction is impossible to build.
 *
 * ## What this module deliberately does NOT do
 *
 * It does not derive the categories. The shipping app subtracts sensor
 * measurements from each other ("in stall but not resting = awake") and turns
 * missing data into confident claims. Here the categories arrive as durations
 * from the approved contract — the direction Data Science themselves proposed
 * on 2026-07-10 ("the data team can return the levels directly") — and this
 * module only validates and presents them. The one thing it computes is the
 * remainder, and the remainder is always called UNKNOWN, never a behaviour.
 *
 * ## The invariant
 *
 * parts + unknown = the window, exactly. If the supplied durations exceed the
 * window (beyond a small tolerance for rounding), the whole chart refuses to
 * draw rather than squeezing lies to fit: an overflow means the upstream
 * calculation is wrong, and normalising it would hide exactly the defect this
 * chart replaces.
 *
 * The category list is open-ended on purpose: the 2026-07-23 requirements
 * meeting already decided REM joins these categories when the sleep work
 * lands, so a fifth segment must be an addition, not a redesign.
 */

export const WINDOW_SECONDS = 24 * 3600;

/** Rounding slack across categories; anything past this is an upstream error. */
export const OVERFLOW_TOLERANCE_SECONDS = 60;

export type Last24HoursState = 'ready' | 'loading' | 'no-data' | 'unavailable';

export interface Last24HoursSegmentInput {
  /** Stable id, e.g. `resting`. Also keys the colour at the presentation layer. */
  id: string;
  /** Customer-facing name, e.g. "In stall, awake" — approved wording only. */
  label: string;
  /** `null` when the contract could not produce this category. */
  seconds: number | null;
}

export interface Last24HoursInput {
  /** End of the window — "now", or the page's selected playhead time. */
  endsAt: DateTime;
  zone: string;
  segments: readonly Last24HoursSegmentInput[];
  state?: Last24HoursState;
}

export interface Last24HoursSegment {
  id: string;
  label: string;
  seconds: number;
  /** Fraction of the 24-hour window, for the band's widths. */
  share: number;
}

export interface Last24Hours {
  state: Last24HoursState;
  /** "24 hours ending 2:30 PM" — the subtitle, so past days read honestly. */
  windowLabel: string;
  segments: Last24HoursSegment[];
  /** The remainder. Always present in the band when non-zero, never hidden. */
  unknownSeconds: number;
}

export function buildLast24Hours({
  endsAt,
  zone,
  segments,
  state,
}: Last24HoursInput): Last24Hours {
  const windowLabel = `24 hours ending ${endsAt.setZone(zone).toFormat('h:mm a')}`;

  const known = segments.filter(
    (segment): segment is Last24HoursSegmentInput & { seconds: number } =>
      segment.seconds !== null,
  );

  let resolved: Last24HoursState = state ?? 'ready';
  if (resolved === 'ready') {
    if (known.length === 0) resolved = 'no-data';
    // A negative duration or a day longer than a day is not a display problem,
    // it is an upstream calculation error — the 25-hour bug this chart exists
    // to make impossible. Refuse to draw rather than normalise it away.
    else if (known.some((segment) => segment.seconds < 0)) resolved = 'unavailable';
    else if (
      known.reduce((sum, segment) => sum + segment.seconds, 0) >
      WINDOW_SECONDS + OVERFLOW_TOLERANCE_SECONDS
    ) {
      resolved = 'unavailable';
    }
  }

  if (resolved !== 'ready') {
    return { state: resolved, windowLabel, segments: [], unknownSeconds: 0 };
  }

  // Clamp only the rounding slack the tolerance admitted, so shares never sum
  // past 1 even when the categories collectively run seconds over.
  const total = Math.min(
    known.reduce((sum, segment) => sum + segment.seconds, 0),
    WINDOW_SECONDS,
  );
  const scale = total > 0 ? total / known.reduce((sum, s) => sum + s.seconds, 0) : 1;

  return {
    state: 'ready',
    windowLabel,
    segments: known.map((segment) => ({
      id: segment.id,
      label: segment.label,
      seconds: segment.seconds,
      share: (segment.seconds * scale) / WINDOW_SECONDS,
    })),
    unknownSeconds: WINDOW_SECONDS - total,
  };
}
