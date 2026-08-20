import { DateTime } from 'luxon';
import { StyleSheet, Text, View } from 'react-native';

import { formatDuration, formatDurationCompact, type UsualCurvePoint } from '@/charts/lying-down';
import {
  outageCaption,
  visitsCaption,
  type PeopleInStallWeek,
} from '@/charts/people-in-stall-behavior';
import { useTokens } from '@/hooks/use-tokens';

import { ChartStateSurface } from './chart-state-surface';
import { LyingDownRowShell } from './lying-down-row-shell';
import { lyingDownStatePresentation } from './lying-down-state';
import { VictoryLyingDownDailyPlot } from './victory-lying-down-adapter';

/** What is missing, in this chart's own words. */
const VISIT_READINGS = 'stall visit readings';

/**
 * People in Stall — the daily row on the Behavior Tracker.
 *
 * Answers Inakshi's question: how much time did people spend inside this stall,
 * and is that normal for it. Presentation is her "Option C", 2026-08-19: the
 * Lying Down layout, plus a strip showing WHEN people were there, captioned with
 * real clock times.
 *
 * Deliberately reuses the Lying Down shell, state policy and Victory adapter
 * rather than growing a parallel set. The two charts are the same measurement
 * shape, so a second implementation would only be a second place to fix the next
 * bug — and a customer who has learned one row has learned both, which is the
 * repetition principle doing real work rather than decorative consistency.
 *
 * The strip differs in MEANING from Lying Down's, and that is the one thing to
 * be careful about. There, grey marks say "the horse was observable". Here,
 * denim marks say "someone was in the stall" and grey bands say "the monitor was
 * not reporting". The caption beneath states which, in words, because the shape
 * alone cannot.
 */

export interface PeopleInStallRowProps {
  /** Stall first — people visit a stall, and the horse in it can change. */
  stallName: string;
  data: PeopleInStallWeek;
  /** This stall's usual total for a whole day. Shown beside today's figure. */
  averageSeconds: number | null;
  usualCurve?: UsualCurvePoint[];
  width: number;
}

const STRIP_HEIGHT = 6;

export function PeopleInStallRow({
  stallName,
  data,
  averageSeconds,
  usualCurve,
  width,
}: PeopleInStallRowProps) {
  const { colors, type, space } = useTokens();
  const { week, today, verdict, zone } = data;
  const day = week.today;
  const state = lyingDownStatePresentation(week.state, verdict, week, VISIT_READINGS);

  const usualEnd = usualCurve?.at(-1);
  const ceiling =
    Math.max(
      today?.totalSeconds ?? 0,
      usualEnd ? (usualEnd.lowSeconds + usualEnd.highSeconds) / 2 : 0,
      averageSeconds ?? 0,
      30 * 60,
    ) * 1.15;

  const at = (seconds: number) => {
    if (!day) return 0;
    const span = day.nextMidnight - day.start;
    if (span <= 0) return 0;
    return Math.min(1, Math.max(0, (seconds - day.start) / span));
  };

  const points = day
    ? week.cumulative.map((point) => ({ f: at(point.at), seconds: point.totalSeconds }))
    : [];

  const figure =
    state.blocksContent || today?.totalSeconds == null
      ? '—'
      : formatDurationCompact(today.totalSeconds);

  // Short by design. The figure above already says what the number is, so the
  // subline only carries what it is being compared against.
  const subline = state.blocksContent
    ? undefined
    : data.usualByNowSeconds === null
      ? 'no usual yet'
      : `usual ${formatDuration(data.usualByNowSeconds)}`;

  // An outage replaces the visit list rather than sitting beside it: a count
  // over a day we only half watched is not comparable with a whole one, and
  // saying so is more use than a number that looks complete.
  const outage = outageCaption(today, zone);
  const caption = outage ?? visitsCaption(today, zone);

  return (
    <LyingDownRowShell
      horseName={stallName}
      badgeLabel={state.badgeLabel}
      badgeTone={state.badgeTone}
      figure={figure}
      subline={subline}
      width={width}>
      <ChartStateSurface
        stateKey={week.state}
        blocksContent={state.blocksContent}
        busy={state.busy}
        message={state.message}>
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

            <View
              testID="people-in-stall-visits"
              style={[
                styles.strip,
                { width, marginTop: space.sm, backgroundColor: colors.background },
              ]}>
              {/* Unobserved stretches first, so a visit that overlaps the edge
                  of an outage still reads as a visit rather than being hidden. */}
              {(today?.unobserved ?? []).map((gap) => (
                <View
                  key={`gap-${gap.enter}-${gap.exit}`}
                  style={{
                    position: 'absolute',
                    left: at(gap.enter) * width,
                    width: Math.max(2, (at(gap.exit) - at(gap.enter)) * width),
                    top: 0,
                    height: STRIP_HEIGHT,
                    borderRadius: STRIP_HEIGHT / 2,
                    backgroundColor: colors.chartTrack,
                  }}
                />
              ))}
              {(today?.visits ?? []).map((visit) => (
                <View
                  key={`visit-${visit.enter}-${visit.exit}`}
                  style={{
                    position: 'absolute',
                    left: at(visit.enter) * width,
                    // A two-minute visit is a real event on a 24-hour axis and
                    // would round away to nothing; a floor keeps it visible.
                    width: Math.max(3, (at(visit.exit) - at(visit.enter)) * width),
                    top: 0,
                    height: STRIP_HEIGHT,
                    borderRadius: STRIP_HEIGHT / 2,
                    backgroundColor: colors.chartData,
                  }}
                />
              ))}
            </View>

            <View style={[styles.axis, { width, marginTop: space.sm }]}>
              {axisLabels(week.dayStartHour).map((label, index) => (
                <Text key={`${index}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
                  {label}
                </Text>
              ))}
            </View>

            <Text style={[type.caption, { color: colors.tertiary, marginTop: space.sm }]}>
              {caption}
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

/** Five labels across the organization's barn day, including minute offsets. */
function axisLabels(dayStartHour: number): string[] {
  const hour = Math.floor(dayStartHour);
  const minute = Math.round((dayStartHour - hour) * 60);
  const base = DateTime.fromObject({ hour, minute });
  const format = minute === 0 ? 'h a' : 'h:mm a';
  return [0, 6, 12, 18, 24].map((offset) => base.plus({ hours: offset }).toFormat(format));
}

const styles = StyleSheet.create({
  strip: { height: STRIP_HEIGHT, borderRadius: STRIP_HEIGHT / 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
