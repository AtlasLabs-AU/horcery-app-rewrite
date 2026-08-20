import { formatDuration, type LyingDownState, type Verdict } from '@/charts/lying-down';

import { BADGE, type BadgeTone } from './lying-down-badge';

export interface LyingDownStatePresentation {
  badgeLabel: string;
  badgeTone: BadgeTone;
  blocksContent: boolean;
  busy: boolean;
  message: string | null;
}

interface Freshness {
  asOf: number;
  lastObservedAt: number | null;
}

/** One semantic state policy shared by the daily and weekly views. */
export function lyingDownStatePresentation(
  state: LyingDownState,
  verdict: Verdict,
  freshness?: Freshness,
): LyingDownStatePresentation {
  const measured = BADGE[verdict];
  const current = (message: string | null, busy = false): LyingDownStatePresentation => ({
    badgeLabel: measured.label,
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
        message: 'Loading lying-down readings',
      };
    case 'no-data':
      return {
        badgeLabel: 'No data',
        badgeTone: 'absent',
        blocksContent: true,
        busy: false,
        message: 'No lying-down readings for this period',
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
        message: 'Lying-down readings are temporarily unavailable',
      };
    case 'unsupported':
      return {
        badgeLabel: 'Unsupported',
        badgeTone: 'absent',
        blocksContent: true,
        busy: false,
        message: 'This monitor does not support lying-down tracking',
      };
    case 'refreshing':
      return current('Updating lying-down readings', true);
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
