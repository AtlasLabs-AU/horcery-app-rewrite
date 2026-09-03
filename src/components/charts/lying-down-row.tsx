import { StyleSheet, Text, View } from 'react-native';

import { barnDayAxisLabels } from '@/charts/barn-day';
import {
  formatDuration,
  formatDurationCompact,
  inStallDisagrees,
  type LyingDownDay,
  type LyingDownWeek,
  type UsualCurvePoint,
  type Verdict,
} from '@/charts/lying-down';
import { useTokens } from '@/hooks/use-tokens';

import { LyingDownRowShell } from './lying-down-row-shell';
import { ChartStateSurface } from './chart-state-surface';
import { lyingDownStatePresentation } from './lying-down-state';
import { VictoryLyingDownDailyPlot } from './victory-lying-down-adapter';

/** Re-exported for convenience; the type itself is domain, not presentation. */
export type { Verdict };

export interface LyingDownRowProps {
  horseName: string;
  week: LyingDownWeek;
  /** From `lyingDownVerdict`. The row renders it; it never derives it. */
  verdict: Verdict;
  /** Typical total for this horse, in seconds. Shown beside today's figure. */
  averageSeconds: number | null;
  /** Data Science's usual cumulative progress through the barn day. */
  usualCurve?: UsualCurvePoint[];
  width: number;
}

const STRIP_HEIGHT = 6;

function fraction(at: number, day: LyingDownDay): number {
  const span = day.nextMidnight - day.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (at - day.start) / span));
}

/**
 * Daily composition only. Drawing lives in the shared Victory adapter; this
 * component is responsible for truthful labels and observation context.
 */
export function LyingDownRow({
  horseName,
  week,
  verdict,
  averageSeconds,
  usualCurve,
  width,
}: LyingDownRowProps) {
  const { colors, type, space } = useTokens();
  const day = week.today;
  const state = lyingDownStatePresentation(week.state, verdict, week);

  const usualEnd = usualCurve?.at(-1);
  const ceiling =
    Math.max(
      day?.totalSeconds ?? 0,
      usualEnd ? (usualEnd.lowSeconds + usualEnd.highSeconds) / 2 : 0,
      averageSeconds ?? 0,
      30 * 60,
    ) * 1.15;
  const points = day
    ? week.cumulative.map((point) => ({
        f: fraction(point.at, day),
        seconds: point.totalSeconds,
      }))
    : [];

  const figure =
    state.blocksContent || day?.totalSeconds === null || day === null
      ? '—'
      : formatDurationCompact(day.totalSeconds);
  const subline = state.blocksContent
    ? undefined
    : averageSeconds === null
      ? 'no average yet'
      : `${formatDuration(averageSeconds)} avg`;

  return (
    <LyingDownRowShell
      horseName={horseName}
      badgeLabel={state.badgeLabel}
      badgeTone={state.badgeTone}
      figure={figure}
      subline={subline}
      width={width}>
      <ChartStateSurface
        stateKey={week.state}
        blocksContent={state.blocksContent}
        busy={state.busy}
        message={state.message}
      >
        {day ? (
          <>
            <View style={{ marginTop: space.md }}>
              <VictoryLyingDownDailyPlot
                points={points}
                usualCurve={usualCurve}
                averageSeconds={averageSeconds}
                ceiling={ceiling}
                verdict={verdict}
                width={width}
                colors={colors}
              />
            </View>

            <View style={[styles.axis, { width, marginTop: space.sm }]}>
              {barnDayAxisLabels(day.start, day.nextMidnight, week.zone).map((label, index) => (
                <Text key={`${index}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
                  {label}
                </Text>
              ))}
            </View>

            <View
              style={[
                styles.strip,
                { width, marginTop: space.md, backgroundColor: colors.background },
              ]}>
              {(inStallDisagrees(day) ? [] : day.inStallIntervals).map((interval, index) => (
                <View
                  key={`${interval.enter}-${interval.exit}-${index}`}
                  style={{
                    position: 'absolute',
                    left: fraction(interval.enter, day) * width,
                    width: Math.max(
                      2,
                      (fraction(interval.exit, day) - fraction(interval.enter, day)) * width,
                    ),
                    top: 0,
                    height: STRIP_HEIGHT,
                    borderRadius: STRIP_HEIGHT / 2,
                    backgroundColor: colors.chartTrack,
                  }}
                />
              ))}
            </View>

            <Text style={[type.caption, { color: colors.tertiary, marginTop: space.sm }]}>
              {day.inStallSeconds === null || inStallDisagrees(day)
                ? 'In-stall time unavailable'
                : `In stall ${formatDuration(day.inStallSeconds)}`}
            </Text>
          </>
        ) : (
          <Text style={[type.caption, { color: colors.tertiary, marginTop: space.md }]}>
            No reading for today
          </Text>
        )}
      </ChartStateSurface>
    </LyingDownRowShell>
  );
}

const styles = StyleSheet.create({
  strip: { height: STRIP_HEIGHT, borderRadius: STRIP_HEIGHT / 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
