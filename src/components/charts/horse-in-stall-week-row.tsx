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
import { IN_STALL } from './weekly-day-detail';

/** What is missing, in this chart's own words. */
const IN_STALL_READINGS = 'in-stall readings';

/**
 * Horse in Stall — the weekly row.
 *
 * The Lying Down weekly design unchanged: bar per day, today hollow because it
 * is unfinished, each bar marked with that weekday's own normal, one badge for
 * the week. A customer who has learned one weekly row has learned all three.
 *
 * Only the tapped-day wording differs, and it inverts: this behaviour's stretches
 * are the resting state, so the panel names the times the horse was OUT.
 */

export interface HorseInStallWeekRowProps {
  /** Stall in stall view, horse in horse view. */
  entityName: string;
  summary: LyingDownWeeklySummary;
  width: number;
}

export function HorseInStallWeekRow({
  entityName,
  summary,
  width,
}: HorseInStallWeekRowProps) {
  const { space } = useTokens();
  const state = lyingDownStatePresentation(
    summary.state,
    summary.verdict,
    summary,
    IN_STALL_READINGS,
  );

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
      horseName={entityName}
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
            panelKey={entityName}
            noun={IN_STALL}
            testID="horse-in-stall-weekly-bars"
          />
        </View>
      </ChartStateSurface>
    </LyingDownRowShell>
  );
}
