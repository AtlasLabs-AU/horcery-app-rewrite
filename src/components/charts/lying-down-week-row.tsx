import { View } from 'react-native';

import {
  formatDuration,
  formatDurationCompact,
  type LyingDownWeeklySummary,
} from '@/charts/lying-down';
import { useTokens } from '@/hooks/use-tokens';

import { LyingDownRowShell } from './lying-down-row-shell';
import { ChartStateSurface } from './chart-state-surface';
import { lyingDownStatePresentation } from './lying-down-state';
import { WeeklyBars } from './weekly-bars';
import { RESTS } from './weekly-day-detail';

export interface LyingDownWeekRowProps {
  horseName: string;
  summary: LyingDownWeeklySummary;
  width: number;
}

/** Weekly composition; all drawing is delegated to the shared Victory adapter. */
export function LyingDownWeekRow({ horseName, summary, width }: LyingDownWeekRowProps) {
  const { space } = useTokens();
  const state = lyingDownStatePresentation(summary.state, summary.verdict, summary);

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
      horseName={horseName}
      badgeLabel={state.badgeLabel}
      badgeTone={state.badgeTone}
      figure={figure}
      subline={subline}
      width={width}>
      <ChartStateSurface
        stateKey={summary.state}
        blocksContent={state.blocksContent}
        busy={state.busy}
        message={state.message}
      >
        <View style={{ marginTop: space.md }}>
          <WeeklyBars
            summary={summary}
            width={width}
            zone={summary.zone}
            panelKey={horseName}
            noun={RESTS}
            testID="lying-down-weekly-bars"
          />
        </View>
      </ChartStateSurface>
    </LyingDownRowShell>
  );
}

