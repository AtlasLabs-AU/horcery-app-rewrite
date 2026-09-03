import { useRouter } from 'expo-router';
import type { DateTime } from 'luxon';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  rollingCaption,
  type ActivenessDay,
  type RollingEvent,
  type RollingWeek,
} from '@/charts/horse-trends';
import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';

import { TextTabs } from '@/components/ui/text-tabs';
import { VictoryActivenessPlot } from './victory-trends-adapter';

/**
 * Horse Trends — Activeness and Rolling, one card, one range control.
 *
 * Follows the approved Figma card except where decisions deviated (register,
 * "Product decisions — Horse Trends"):
 *
 * - Range labels are **24 hours / 7 days** (deviation from the annotation's
 *   Daily/Weekly): the short view is a rolling window ending now, and calling
 *   a 3 AM–3 AM window "Daily" invites "why does my day start at 3 AM?".
 * - **No Higher/Usual/Lower pill.** The design shows one; the shipping
 *   comparison reads "Higher" on any difference at all and its replacement is
 *   unapproved. The header keeps the space; the pill arrives with the contract.
 * - Rolling events draw at their EXACT minute and tapping the row opens
 *   Review History — both straight from the design.
 */

export type TrendRange = '24h' | '7d';

const RANGE_OPTIONS: { label: string; value: TrendRange }[] = [
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
];

const STRIP_HEIGHT = 6;
const DOT = 12;
const BAR_AREA_HEIGHT = 56;
const MARKER_OVERHANG = 3;

export interface HorseTrendsCardProps {
  activeness: ActivenessDay;
  rollingEvents: RollingEvent[];
  rollingWeek: RollingWeek;
  zone: string;
  now: DateTime;
  width: number;
}

export function HorseTrendsCard({
  activeness,
  rollingEvents,
  rollingWeek,
  zone,
  now,
  width,
}: HorseTrendsCardProps) {
  const { colors, type, space } = useTokens();
  const [range, setRange] = useState<TrendRange>('24h');
  const router = useRouter();

  const axis =
    range === '24h'
      ? [24, 18, 12, 6, 0].map((hoursAgo) => now.minus({ hours: hoursAgo }).toFormat('h a'))
      : null;

  return (
    <View testID="horse-trends">
      <View style={styles.header}>
        <Text style={[type.headline, { color: colors.foreground }]}>Horse Trends</Text>
        <TextTabs
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          testID="horse-trends-range"
        />
      </View>

      <View style={{ marginTop: space.md }}>
        <Text style={[type.caption, styles.rowTitle, { color: colors.secondary }]}>
          Activeness
        </Text>
        {activeness.state === 'ready' ? (
          range === '24h' ? (
            <VictoryActivenessPlot day={activeness} width={width} colors={colors} />
          ) : (
            <Text style={[type.caption, { color: colors.tertiary, marginTop: space.xs }]}>
              7-day activeness arrives with the approved daily query
            </Text>
          )
        ) : (
          <Text style={[type.caption, { color: colors.tertiary, marginTop: space.xs }]}>
            No activeness readings for this period
          </Text>
        )}
      </View>

      <Pressable
        testID="horse-trends-rolling"
        accessibilityRole="button"
        accessibilityLabel="Rolling — opens Review History filtered to rolling events"
        onPress={() => router.push('/review-history')}
        style={{ marginTop: space.lg }}>
        <Text style={[type.caption, styles.rowTitle, { color: colors.secondary }]}>Rolling</Text>

        {range === '24h' ? (
          <>
            <View
              style={[
                styles.strip,
                { width, backgroundColor: colors.chartBand, marginTop: space.sm },
              ]}>
              {rollingEvents.map((event) => {
                const f = Math.min(
                  1,
                  Math.max(0, (event.at - now.minus({ hours: 24 }).toSeconds()) / (24 * 3600)),
                );
                return (
                  <View
                    key={`${event.at}-${event.kind}`}
                    style={{
                      position: 'absolute',
                      left: Math.min(f * width, width - DOT),
                      top: (STRIP_HEIGHT - DOT) / 2,
                      width: DOT,
                      height: DOT,
                      borderRadius: DOT / 2,
                      backgroundColor:
                        event.kind === 'rolling' ? colors.chartData : colors.chartDataSoft,
                    }}
                  />
                );
              })}
            </View>
            <Text style={[type.caption, { color: colors.tertiary, marginTop: space.sm }]}>
              {rollingCaption(rollingEvents, zone)}
            </Text>
          </>
        ) : (
          <RollingWeekBars week={rollingWeek} width={width} />
        )}
      </Pressable>

      {axis ? (
        <View style={[styles.axis, { width, marginTop: space.sm }]}>
          {axis.map((label, index) => (
            <Text key={`${index}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[styles.legend, { marginTop: space.sm }]}>
        <Legend swatch={colors.chartData} label="Rolling" />
        <Legend swatch={colors.chartDataSoft} label="Partial Rolling" />
      </View>
    </View>
  );
}

/**
 * This week's counts as bars, last week as quiet markers — the same idiom as
 * the weekly behaviour charts' average markers, so it is learned once. Today
 * is hollow because it is unfinished; an unobserved day is an empty dashed
 * slot, never a zero bar.
 */
function RollingWeekBars({ week, width }: { week: RollingWeek; width: number }) {
  const { colors, type, space } = useTokens();
  const columnWidth = week.days.length > 0 ? width / week.days.length : width;
  const peak = Math.max(
    ...week.days.flatMap((day) => [day.count ?? 0, day.previousCount ?? 0]),
    2,
  );
  const barWidth = Math.max(8, columnWidth * 0.4);

  return (
    <View testID="rolling-week-bars">
      <View style={[styles.barArea, { width, marginTop: space.sm }]}>
        {week.days.map((day) => {
          const height =
            day.count === null ? BAR_AREA_HEIGHT : Math.max(3, (day.count / peak) * BAR_AREA_HEIGHT);
          return (
            <View key={day.key} style={[styles.barColumn, { width: columnWidth }]}>
              {day.previousCount !== null ? (
                <View
                  style={{
                    position: 'absolute',
                    bottom: Math.max(2, (day.previousCount / peak) * BAR_AREA_HEIGHT) - 1,
                    left: columnWidth / 2 - barWidth / 2 - MARKER_OVERHANG,
                    width: barWidth + MARKER_OVERHANG * 2,
                    height: 2,
                    backgroundColor: colors.chartReference,
                  }}
                />
              ) : null}
              <View
                style={[
                  {
                    width: barWidth,
                    height,
                    borderRadius: 3,
                  },
                  day.count === null
                    ? {
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: colors.chartTrack,
                      }
                    : day.isToday
                      ? {
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: colors.chartData,
                        }
                      : { backgroundColor: colors.chartData },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={[styles.axis, { width }]}>
        {week.days.map((day) => (
          <Text
            key={day.key}
            style={[
              type.micro,
              styles.axisLabel,
              { width: columnWidth, color: day.count === null ? colors.dimmed : colors.tertiary },
            ]}>
            {day.isToday ? 'Today' : day.weekday}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  const { colors, type } = useTokens();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: swatch }]} />
      <Text style={[type.micro, { color: colors.tertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontFamily: font.semibold },
  strip: { height: STRIP_HEIGHT, borderRadius: STRIP_HEIGHT / 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { textAlign: 'center' },
  barArea: { flexDirection: 'row', alignItems: 'flex-end', height: BAR_AREA_HEIGHT },
  barColumn: { alignItems: 'center', justifyContent: 'flex-end', height: BAR_AREA_HEIGHT },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
});
