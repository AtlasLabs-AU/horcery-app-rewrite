import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

import {
  formatDuration,
  formatDurationCompact,
  type LyingDownWeeklySummary,
} from '@/charts/lying-down';

import { BADGE, badgeInkFor, badgeStyleFor } from './lying-down-badge';

/**
 * Lying Down — the weekly row: one bar a day, seven days ending today.
 *
 * Mirrors the shipping app's weekly view (a bar per day, rotated so today is
 * last, with that weekday's four-week average marked on each bar), on our
 * palette and with three corrections that are about honesty rather than taste:
 *
 * 1. **Today is drawn hollow.** The app paints today in the STRONGEST colour and
 *    fades the six completed days. That is backwards: today is the unfinished
 *    one, and at 7 am a solid bar beside six full days reads as a collapse. A
 *    dashed outline says "still filling", and `buildLyingDownWeekly` never
 *    judges today for the same reason.
 * 2. **A day with no observations is an empty slot, not a zero-height bar.** The
 *    app reorders its weekly array with a default of `0`, so a day the monitor
 *    missed looks exactly like a horse that never lay down — which is itself a
 *    welfare alarm. Same null-is-not-zero rule the daily view already enforces.
 * 3. **Per-day colouring is computed but NOT drawn — withdrawn on the evidence.**
 *    Colouring each day by its own verdict was the plan, and on the device it
 *    turned three of six bars ochre for a perfectly ordinary horse. That is not
 *    a rendering bug: a horse's lying-down time varies far more than 25 % from
 *    one day to the next (14–189 minutes in one real week), so a 25 % per-day
 *    threshold marks most days unusual. PRINCIPLES.md is explicit that if ochre
 *    becomes routine the threshold is wrong, not the palette — and the threshold
 *    is Data Science's to set. It may also be why the shipping app's own
 *    Usual/Unusual pill is dead-coded off. So every completed bar is `chartData`
 *    and the week's badge carries the verdict; `buildLyingDownWeekly` still
 *    computes each day's verdict, ready for a per-day threshold we can trust.
 *
 * The badge reports the WEEK, not today (Inakshi, 2026-08-19), so the badge and
 * the chart describe the same span.
 */

export interface LyingDownWeekRowProps {
  horseName: string;
  summary: LyingDownWeeklySummary;
  width: number;
}

const CHART_HEIGHT = 56;
const BAR_WIDTH_RATIO = 0.46;
/** How far the average marker overhangs its bar, each side. */
const MARKER_OVERHANG = 4;
const BADGE_COLUMN = 88;
const FIGURE_COLUMN = 78;

export function LyingDownWeekRow({ horseName, summary, width }: LyingDownWeekRowProps) {
  const { colors, type, space } = useTokens();
  const badge = BADGE[summary.verdict];

  const columnWidth = width / summary.days.length;
  const barWidth = Math.max(6, columnWidth * BAR_WIDTH_RATIO);

  // Scaled against the tallest thing actually drawn — bars and their markers —
  // so a horse whose normal sits above every bar still shows its markers.
  const peak =
    Math.max(
      ...summary.days.flatMap((day) => [day.totalSeconds ?? 0, day.usualSeconds ?? 0]),
      30 * 60,
    ) * 1.15;
  const heightOf = (seconds: number) =>
    Math.max(2, Math.min(1, seconds / peak) * CHART_HEIGHT);

  const figure =
    summary.dailyAverageSeconds === null
      ? '—'
      : formatDurationCompact(summary.dailyAverageSeconds);

  // Says what the figure is an average OF. A week we could only half see is a
  // different claim from a full one, and the difference belongs on screen.
  const subline =
    summary.dailyAverageSeconds === null
      ? 'no complete day observed'
      : summary.observedDays < summary.days.length - 1
        ? `a day, over the ${summary.observedDays} days we could see`
        : summary.usualDailyAverageSeconds === null
          ? 'a day, no usual yet'
          : `a day, against ${formatDuration(summary.usualDailyAverageSeconds)} usual`;

  return (
    <View style={[styles.row, { width, paddingVertical: space.edge }]}>
      <View style={styles.header}>
        <Text style={[type.subhead, styles.name, { color: colors.secondary }]} numberOfLines={1}>
          {horseName}
        </Text>
        <View style={styles.badgeColumn}>
          <View
            style={[styles.badge, badgeStyleFor(badge.tone, colors), { paddingHorizontal: space.sm }]}>
            <Text
              style={[type.caption, styles.badgeText, { color: badgeInkFor(badge.tone, colors) }]}
              numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        </View>
        <Text style={[type.title3, styles.figure, { color: colors.foreground }]} numberOfLines={1}>
          {figure}
        </Text>
      </View>

      <Text style={[type.caption, styles.subline, { color: colors.tertiary }]}>{subline}</Text>

      <View style={[styles.chart, { height: CHART_HEIGHT, marginTop: space.md }]}>
        {summary.days.map((day, index) => {
          const centre = columnWidth * (index + 0.5);
          const left = centre - barWidth / 2;
          // A Fragment, not a View: a wrapper View would lay out in normal flow
          // with no size, and every absolutely-positioned bar would anchor to it
          // rather than to the plot — which stacked all seven on top of the row.
          return (
            <Fragment key={day.key}>
              {day.totalSeconds === null ? (
                // Unobserved: an empty slot the full height of the plot. Never a
                // short bar, which would read as "the horse hardly lay down".
                <View
                  style={{
                    position: 'absolute',
                    left,
                    width: barWidth,
                    bottom: 0,
                    height: CHART_HEIGHT,
                    borderRadius: 3,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.chartTrack,
                  }}
                />
              ) : day.isToday ? (
                // Still accumulating, so outlined rather than filled.
                <View
                  style={{
                    position: 'absolute',
                    left,
                    width: barWidth,
                    bottom: 0,
                    height: heightOf(day.totalSeconds),
                    borderRadius: 3,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.chartData,
                  }}
                />
              ) : (
                <View
                  testID={`lying-down-bar-${index}`}
                  style={{
                    position: 'absolute',
                    left,
                    width: barWidth,
                    bottom: 0,
                    height: heightOf(day.totalSeconds),
                    borderRadius: 3,
                    backgroundColor: colors.chartData,
                  }}
                />
              )}

              {day.usualSeconds !== null ? (
                <View
                  style={{
                    position: 'absolute',
                    left: left - MARKER_OVERHANG,
                    width: barWidth + MARKER_OVERHANG * 2,
                    bottom: heightOf(day.usualSeconds),
                    height: 2,
                    backgroundColor:
                      day.totalSeconds === null ? colors.chartTrack : colors.chartReference,
                  }}
                />
              ) : null}
            </Fragment>
          );
        })}
      </View>

      <View style={[styles.axis, { marginTop: space.sm }]}>
        {summary.days.map((day, index) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {},
  header: { flexDirection: 'row', alignItems: 'baseline' },
  name: { flex: 1 },
  badgeColumn: { width: BADGE_COLUMN, alignItems: 'flex-end' },
  badge: { paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontWeight: '600' },
  figure: { width: FIGURE_COLUMN, textAlign: 'right' },
  subline: { textAlign: 'right' },
  chart: { position: 'relative' },
  axis: { flexDirection: 'row' },
  axisLabel: { textAlign: 'center' },
});
