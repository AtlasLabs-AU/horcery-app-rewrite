import { View } from 'react-native';

import {
  formatDuration,
  formatDurationCompact,
  type LyingDownWeeklySummary,
} from '@/charts/lying-down';
import { useTokens } from '@/hooks/use-tokens';

import { ChartStateSurface } from './chart-state-surface';
import { LyingDownRowShell } from './lying-down-row-shell';
import { lyingDownStatePresentation } from './lying-down-state';
import { WeeklyBars } from './weekly-bars';
import { VISITS } from './weekly-day-detail';

/** What is missing, in this chart's own words. */
const VISIT_READINGS = 'stall visit readings';

/**
 * People in Stall — the weekly row.
 *
 * Reuses the Lying Down weekly design unchanged (Inakshi, 2026-08-19): nothing
 * about people-time changes what a week of daily totals should look like. Bar
 * per day, today hollow because it is unfinished, each bar marked with that
 * weekday's own normal, one badge for the week.
 *
 * The wording is the only difference, and it matters: this is time the stall was
 * occupied by someone, never a count of people.
 */

export interface PeopleInStallWeekRowProps {
  stallName: string;
  summary: LyingDownWeeklySummary;
  width: number;
}

export function PeopleInStallWeekRow({
  stallName,
  summary,
  width,
}: PeopleInStallWeekRowProps) {
  const { space } = useTokens();
  const state = lyingDownStatePresentation(summary.state, summary.verdict, summary, VISIT_READINGS);

  const figure =
    state.blocksContent || summary.dailyAverageSeconds === null
      ? '—'
      : formatDurationCompact(summary.dailyAverageSeconds);

  const subline = state.blocksContent
    ? undefined
    : summary.dailyAverageSeconds === null
      ? 'no complete day observed'
      : summary.observedDays < summary.days.length - 1
        ? `a day, over the ${summary.observedDays} days we could see`
        : summary.usualDailyAverageSeconds === null
          ? 'a day, no average yet'
          : `a day, ${formatDuration(summary.usualDailyAverageSeconds)} avg`;

  return (
    <LyingDownRowShell
      horseName={stallName}
      badgeLabel={state.badgeLabel}
      badgeTone={state.badgeTone}
      figure={figure}
      subline={subline}
      width={width}>
      <ChartStateSurface
        stateKey={summary.state}
        blocksContent={state.blocksContent}
        busy={state.busy}
        message={state.message}>
        <View style={{ marginTop: space.md }}>
          <WeeklyBars
            summary={summary}
            width={width}
            zone={summary.zone}
            noun={VISITS}
            testID="people-in-stall-weekly-bars"
          />
        </View>
      </ChartStateSurface>
    </LyingDownRowShell>
  );
}

