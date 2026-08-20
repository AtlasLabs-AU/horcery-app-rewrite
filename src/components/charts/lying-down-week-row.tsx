import { StyleSheet, Text, View } from 'react-native';

import {
  formatDuration,
  formatDurationCompact,
  type LyingDownWeeklySummary,
} from '@/charts/lying-down';
import { useTokens } from '@/hooks/use-tokens';

import { LyingDownRowShell } from './lying-down-row-shell';
import { ChartStateSurface } from './chart-state-surface';
import { lyingDownStatePresentation } from './lying-down-state';
import { VictoryLyingDownWeeklyPlot } from './victory-lying-down-adapter';

export interface LyingDownWeekRowProps {
  horseName: string;
  summary: LyingDownWeeklySummary;
  width: number;
}

/** Weekly composition; all drawing is delegated to the shared Victory adapter. */
export function LyingDownWeekRow({ horseName, summary, width }: LyingDownWeekRowProps) {
  const { colors, type, space } = useTokens();
  const state = lyingDownStatePresentation(summary.state, summary.verdict, summary);
  const columnWidth = width / summary.days.length;

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
          ? 'a day, no usual yet'
          : `a day, against ${formatDuration(summary.usualDailyAverageSeconds)} usual`;

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
        <>
          <View style={{ marginTop: space.md }}>
            <VictoryLyingDownWeeklyPlot summary={summary} width={width} colors={colors} />
          </View>

          <View style={[styles.axis, { marginTop: space.sm }]}>
            {summary.days.map((day) => (
              <Text
                key={day.key}
                style={[
                  type.micro,
                  styles.axisLabel,
                  {
                    width: columnWidth,
                    color: day.totalSeconds === null ? colors.dimmed : colors.tertiary,
                  },
                ]}
                numberOfLines={1}>
                {day.isToday ? 'Today' : day.weekday}
              </Text>
            ))}
          </View>
        </>
      </ChartStateSurface>
    </LyingDownRowShell>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row' },
  axisLabel: { textAlign: 'center' },
});
