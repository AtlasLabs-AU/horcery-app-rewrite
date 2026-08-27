import { formatDuration, type LyingDownState, type Verdict } from '@/charts/lying-down';

import { BADGE, verdictIsShowable, type BadgeTone } from './lying-down-badge';

export interface LyingDownStatePresentation {
  /** `null` withholds the badge — see `DEVIATION_VERDICTS_APPROVED`. */
  badgeLabel: string | null;
  badgeTone: BadgeTone;
  blocksContent: boolean;
  busy: boolean;
  message: string | null;
}

interface Freshness {
  asOf: number;
  lastObservedAt: number | null;
}

/**
 * One semantic state policy shared by the daily and weekly views, and now by
 * People in Stall as well.
 *
 * `readings` names what is missing, because the message is read by someone who
 * is looking at one specific chart: "No lying-down readings" and "No stall visit
 * readings" are different facts, and a shared component that says the wrong one
 * is worse than a vague one. It shipped saying "lying-down" on the People in
 * Stall chart, which is how this parameter came to exist.
 *
 * (The function keeps its lying-down name for now; renaming it would touch every
 * caller for no behavioural gain, and is worth doing when the third chart lands.)
 */
export function lyingDownStatePresentation(
  state: LyingDownState,
  verdict: Verdict,
  freshness?: Freshness,
  readings: string = 'lying-down readings',
): LyingDownStatePresentation {
  const measured = BADGE[verdict];
  // A withheld verdict shows NO badge rather than a substitute word: every
  // stand-in we tried ("No history", "Unknown") states a reason that is not
  // the true one.
  const showable = verdictIsShowable(verdict);
  const current = (message: string | null, busy = false): LyingDownStatePresentation => ({
    badgeLabel: showable ? measured.label : null,
    badgeTone: measured.tone,
    blocksContent: false,
    busy,
    message,
  });

  switch (state) {
    case 'loading':
      return {
        badgeLabel: 'Loading',
        badgeTone: 'absent',
        blocksContent: true,
        busy: true,
        message: `Loading ${readings}`,
      };
    case 'no-data':
      return {
        badgeLabel: 'No data',
        badgeTone: 'absent',
        blocksContent: true,
        busy: false,
        message: `No ${readings} for this period`,
      };
    case 'out-of-stall':
      return {
        badgeLabel: 'Out of stall',
        badgeTone: 'absent',
        blocksContent: true,
        busy: false,
        message: 'The horse was not in the stall during this period',
      };
    case 'unavailable':
      return {
        badgeLabel: 'Unavailable',
        badgeTone: 'absent',
        blocksContent: true,
        busy: false,
        message: 'These readings are temporarily unavailable',
      };
    case 'unsupported':
      return {
        badgeLabel: 'Unsupported',
        badgeTone: 'absent',
        blocksContent: true,
        busy: false,
        message: `This monitor does not report ${readings}`,
      };
    case 'refreshing':
      return current(`Updating ${readings}`, true);
    case 'stale': {
      const age =
        freshness?.lastObservedAt === null || freshness?.lastObservedAt === undefined
          ? null
          : Math.max(0, freshness.asOf - freshness.lastObservedAt);
      return current(
        age === null
          ? 'These readings are stale; last update time is unavailable'
          : `Last reading ${formatDuration(age)} ago`,
      );
    }
    case 'partial':
      return current('Some readings are missing');
    case 'ready':
      return current(null);
  }
}
