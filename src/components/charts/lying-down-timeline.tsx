import { DateTime } from 'luxon';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '@/charts/lying-down';
import { font } from '@/constants/fonts';
import type { LyingDownTimeline as TimelineModel, TimelineDay } from '@/charts/lying-down-timeline';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Lying Down timeline — the original chart plus one state (Inakshi, 2026-09-07,
 * mockup v3): bars on plain day rows, oldest at the top, tap for a tooltip,
 * and a dashed "No readings" stretch wherever there is nothing to draw.
 *
 * Two rules the legacy chart broke, kept here in the drawing layer:
 *
 * - A bar's WIDTH is visual; its DURATION is the model's. A single 30-second
 *   reading is widened to `MIN_BAR_WIDTH` so it can be seen and tapped, but the
 *   tooltip reports the seconds the samples support. Legacy added 89 s to the
 *   data to make a bar reach 23:59:59.
 * - Today's row ends at the current time. Nothing is drawn past it.
 */

/**
 * A bout shorter than a minute says so in seconds. `formatDuration` rounds to
 * the nearest minute, which turns one 30-second reading into "1 min" — a
 * manufactured duration, exactly what the brief (§3A) forbids a visible mark
 * from adding.
 */
function boutDuration(seconds: number): string {
  return seconds < 60 ? `${Math.round(seconds)} s` : formatDuration(seconds);
}

const ROW_HEIGHT = 30;
const BAR_HEIGHT = 12;
const MIN_BAR_WIDTH = 4;
const LABEL_WIDTH = 50;

export interface LyingDownTimelineProps {
  timeline: TimelineModel;
  width: number;
  testID?: string;
}

export function LyingDownTimeline({ timeline, width, testID }: LyingDownTimelineProps) {
  const { colors, type, space, radius } = useTokens();
  const [open, setOpen] = useState<{ day: string; index: number } | null>(null);
  const plotWidth = Math.max(0, width - LABEL_WIDTH);

  if (timeline.state === 'no-data') {
    return (
      <View testID={testID}>
        <View style={[styles.stateBed, { backgroundColor: colors.bed, borderRadius: radius.sm, padding: space.md }]}>
          <Text style={[type.caption, { color: colors.secondary }]}>No lying-down readings for this period</Text>
        </View>
      </View>
    );
  }

  const openDay = open ? timeline.days.find((d) => d.key === open.day) : undefined;
  const openBout = openDay?.bouts[open!.index];

  return (
    <View testID={testID}>
      {openDay && openBout ? (
        <View
          testID="lying-down-timeline-tooltip"
          style={[styles.tooltip, { backgroundColor: colors.bed, borderRadius: radius.sm, padding: space.md, marginBottom: space.sm }]}>
          <Text style={[type.caption, styles.tooltipTitle, { color: colors.foreground }]}>
            {tooltipTitle(openDay, openBout.enter, openBout.exit, timeline.zone)}
          </Text>
          <Text style={[type.caption, { color: colors.secondary }]}>
            {boutDuration(openBout.exit - openBout.enter)}
          </Text>
        </View>
      ) : null}

      {timeline.days.map((day) => {
        const span = day.nextMidnight - day.start;
        const f = (t: number) => (span <= 0 ? 0 : Math.min(1, Math.max(0, (t - day.start) / span)));
        return (
          <View key={day.key} style={[styles.row, { height: ROW_HEIGHT }]}>
            <Text
              style={[
                type.micro,
                styles.label,
                { width: LABEL_WIDTH, color: day.isToday ? colors.foreground : colors.tertiary },
              ]}>
              {day.isToday ? 'Today' : DateTime.fromISO(day.key, { zone: timeline.zone }).toFormat('ccc d')}
            </Text>
            <View style={[styles.track, { width: plotWidth }]}>
              {/* The row's own hairline, ending at now for today. */}
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  width: f(day.end) * plotWidth,
                  top: ROW_HEIGHT / 2,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: colors.divider,
                }}
              />
              {day.unobserved.map((gap) => (
                <View
                  key={`gap-${gap.from}`}
                  testID="lying-down-timeline-gap"
                  style={{
                    position: 'absolute',
                    left: f(gap.from) * plotWidth,
                    width: Math.max(MIN_BAR_WIDTH, (f(gap.to) - f(gap.from)) * plotWidth),
                    top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                    height: BAR_HEIGHT,
                    borderRadius: BAR_HEIGHT / 2,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.chartReference,
                  }}
                />
              ))}
              {day.bouts.map((bout, index) => {
                const selected = open?.day === day.key && open.index === index;
                return (
                  <Pressable
                    key={`bout-${bout.enter}`}
                    testID="lying-down-timeline-bout"
                    accessibilityRole="button"
                    accessibilityLabel={`${tooltipTitle(day, bout.enter, bout.exit, timeline.zone)}. ${boutDuration(bout.exit - bout.enter)}`}
                    accessibilityState={{ selected }}
                    onPress={() => setOpen(selected ? null : { day: day.key, index })}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    style={{
                      position: 'absolute',
                      left: f(bout.enter) * plotWidth,
                      width: Math.max(MIN_BAR_WIDTH, (f(bout.exit) - f(bout.enter)) * plotWidth),
                      top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                      height: BAR_HEIGHT,
                      borderRadius: BAR_HEIGHT / 2,
                      backgroundColor: colors.chartData,
                      opacity: open && !selected ? 0.4 : 1,
                    }}
                  />
                );
              })}
              {day.isToday ? (
                <View
                  style={{
                    position: 'absolute',
                    left: f(day.end) * plotWidth,
                    top: (ROW_HEIGHT - BAR_HEIGHT) / 2 - 3,
                    width: 1.5,
                    height: BAR_HEIGHT + 6,
                    backgroundColor: colors.foreground,
                  }}
                />
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={[styles.axis, { marginLeft: LABEL_WIDTH, width: plotWidth, marginTop: space.xs }]}>
        {['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map((label, i) => (
          <Text key={`${i}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={[styles.legend, { marginTop: space.sm }]}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.chartData }]} />
          <Text style={[type.micro, { color: colors.tertiary }]}>Lying down</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.chartReference }]} />
          <Text style={[type.micro, { color: colors.tertiary }]}>No readings</Text>
        </View>
      </View>
    </View>
  );
}

function tooltipTitle(day: TimelineDay, enter: number, exit: number, zone: string): string {
  const at = (s: number) => DateTime.fromSeconds(s, { zone }).toFormat('h:mm a');
  const label = day.isToday ? 'Today' : DateTime.fromISO(day.key, { zone }).toFormat('ccc d');
  return `${label} · ${at(enter)} – ${at(exit)}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { paddingRight: 6 },
  track: { height: ROW_HEIGHT },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 8, borderRadius: 4 },
  tooltip: { alignSelf: 'flex-start' },
  tooltipTitle: { fontFamily: font.semibold },
  stateBed: {},
});
