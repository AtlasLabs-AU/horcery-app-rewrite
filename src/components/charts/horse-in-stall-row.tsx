import { StyleSheet, Text, View } from 'react-native';

import { barnDayAxisLabels } from '@/charts/barn-day';
import { formatDuration, formatDurationCompact, type UsualCurvePoint } from '@/charts/lying-down';
import { absencesCaption, type HorseInStallWeek } from '@/charts/horse-in-stall-behavior';
import { useTokens } from '@/hooks/use-tokens';

import { ChartStateSurface } from './chart-state-surface';
import { LyingDownRowShell } from './lying-down-row-shell';
import { lyingDownStatePresentation } from './lying-down-state';
import { VictoryLyingDownDailyPlot } from './victory-lying-down-adapter';

/** What is missing, in this chart's own words. */
const IN_STALL_READINGS = 'in-stall readings';

/**
 * Horse in Stall — the daily row on the Behavior Tracker.
 *
 * The line is hours in the stall so far against the entity's own normal; the
 * strip beneath is when. Inakshi, 2026-08-20: the total says how long, the strip
 * says when, and a low total that explains itself is not a worry.
 *
 * ## The strip reads the opposite way round to People in Stall's
 *
 * There, a denim mark is the event: someone came. Here the horse is in almost
 * all day, so the marks are the background and the GAPS are what a customer
 * looks for. The caption names the gaps for the same reason.
 *
 * Three things have to stay visually distinct, because two of them are facts and
 * one is an absence of fact:
 *
 * - **in the stall** — denim, the filled run
 * - **out** — the pale track showing through
 * - **not recorded** — mid grey, and never mistakable for "out"
 *
 * The third is the one that matters. A gap the monitor did not see looks exactly
 * like turnout on any chart that draws only two states, and calling an outage
 * "turnout" is the shipping app's missing-data-reads-as-fact bug in a new place.
 */

export interface HorseInStallRowProps {
  /**
   * The stall in stall view, the horse in horse view — the entity model decided
   * on 2026-08-20, where the stall is primary because a camera with no horse
   * assigned must still appear.
   */
  entityName: string;
  data: HorseInStallWeek;
  /** This entity's usual total for a whole day. Shown beside today's figure. */
  averageSeconds: number | null;
  usualCurve?: UsualCurvePoint[];
  width: number;
}

const STRIP_HEIGHT = 6;

export function HorseInStallRow({
  entityName,
  data,
  averageSeconds,
  usualCurve,
  width,
}: HorseInStallRowProps) {
  const { colors, type, space } = useTokens();
  const { week, today, verdict, zone } = data;
  const day = week.today;
  const state = lyingDownStatePresentation(week.state, verdict, week, IN_STALL_READINGS);

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

  // "avg", the same word and the same whole-day value as the other two rows.
  // Identical-looking rows must not print different kinds of number.
  const subline = state.blocksContent
    ? undefined
    : averageSeconds === null
      ? 'no average yet'
      : `${formatDuration(averageSeconds)} avg`;

  return (
    <LyingDownRowShell
      horseName={entityName}
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
              testID="horse-in-stall-strip"
              style={[
                styles.strip,
                // The pale track IS "out" — what shows through between runs.
                { width, marginTop: space.sm, backgroundColor: colors.chartBand },
              ]}>
              {(today?.inStall ?? []).map((stretch) => (
                <View
                  key={`in-${stretch.enter}-${stretch.exit}`}
                  style={{
                    position: 'absolute',
                    left: at(stretch.enter) * width,
                    width: Math.max(3, (at(stretch.exit) - at(stretch.enter)) * width),
                    top: 0,
                    height: STRIP_HEIGHT,
                    borderRadius: STRIP_HEIGHT / 2,
                    backgroundColor: colors.chartData,
                  }}
                />
              ))}
              {/* Drawn last so an outage is never hidden under a run of
                  in-stall time that only appears to span it. */}
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
            </View>

            <View style={[styles.axis, { width, marginTop: space.sm }]}>
              {barnDayAxisLabels(day.start, day.nextMidnight, zone).map((label, index) => (
                <Text key={`${index}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
                  {label}
                </Text>
              ))}
            </View>

            <Text style={[type.caption, { color: colors.tertiary, marginTop: space.sm }]}>
              {absencesCaption(today, zone)}
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
