import type { Last24HoursSegmentInput } from '../last-24-hours';

/**
 * Fixtures for the Last 24 Hours band, shaped like the contract will be:
 * durations per category, already computed upstream. Magnitudes echo the real
 * monitors (7.6–22.6 h in stall a day; resting a few hours of that).
 *
 * REM appears in one fixture even though the category does not exist yet: the
 * 2026-07-23 requirements meeting decided it joins the chart with the sleep
 * work, and a presentation that cannot take a fifth segment now would be a
 * redesign later.
 */

const HOUR = 3600;
const MIN = 60;

export const RESTING = { id: 'resting', label: 'Resting' };
export const AWAKE = { id: 'in-stall-awake', label: 'In stall, awake' };
export const OUT = { id: 'out-of-stall', label: 'Out of stall' };
export const REM = { id: 'rem', label: 'REM sleep' };

const seg = (
  kind: { id: string; label: string },
  seconds: number | null,
): Last24HoursSegmentInput => ({ ...kind, seconds });

/** The routine day: overnight rest, morning turnout, everything accounted for. */
export const ordinaryDay: Last24HoursSegmentInput[] = [
  seg(RESTING, 9 * HOUR + 15 * MIN),
  seg(AWAKE, 12 * HOUR + 3 * MIN),
  seg(OUT, 2 * HOUR + 30 * MIN),
];

/** The monitor missed a stretch overnight; the remainder must show as unknown. */
export const brokenNight: Last24HoursSegmentInput[] = [
  seg(RESTING, 7 * HOUR + 5 * MIN),
  seg(AWAKE, 11 * HOUR + 40 * MIN),
  seg(OUT, 2 * HOUR + 33 * MIN),
];

/** At grass all day — the band is almost entirely the out segment. */
export const outAllDay: Last24HoursSegmentInput[] = [
  seg(RESTING, 0),
  seg(AWAKE, 1 * HOUR + 10 * MIN),
  seg(OUT, 22 * HOUR + 50 * MIN),
];

/** The future five-category day, once the sleep work lands. */
export const withRem: Last24HoursSegmentInput[] = [
  seg(REM, 2 * HOUR + 40 * MIN),
  seg(RESTING, 6 * HOUR + 35 * MIN),
  seg(AWAKE, 12 * HOUR + 15 * MIN),
  seg(OUT, 2 * HOUR + 30 * MIN),
];

/** Nothing came back at all. */
export const noData: Last24HoursSegmentInput[] = [
  seg(RESTING, null),
  seg(AWAKE, null),
  seg(OUT, null),
];

/** The shipping app's 25-hour bug, as input — must refuse to draw. */
export const overflowDay: Last24HoursSegmentInput[] = [
  seg(RESTING, 2 * HOUR),
  seg(AWAKE, 20 * HOUR),
  seg(OUT, 3 * HOUR),
];
