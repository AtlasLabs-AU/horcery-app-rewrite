import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { barnDayAxisLabels } from '@/charts/barn-day';
import type { HorseInStallStrip as StripModel, HorseInStallStripRow } from '@/charts/horse-in-stall-strip';
import { formatDuration, formatDurationCompact } from '@/charts/lying-down';
import { useTokens } from '@/hooks/use-tokens';

import { ChartStateSurface } from './chart-state-surface';
import { LyingDownRowShell } from './lying-down-row-shell';
import { lyingDownStatePresentation } from './lying-down-state';
import { IN_STALL, weeklyDayDetail } from './weekly-day-detail';

/** What is missing, in this chart's own words. */
const IN_STALL_READINGS = 'in-stall readings';

/**
 * Horse in Stall on the horse page — seven barn days, one strip each, today
 * at the top.
 *
 * Three states and no legend (Inakshi, 2026-09-05 — "it's not a dashboard"):
 *
 * - **in** — the denim run
 * - **out** — the pale track showing through
 * - **not recorded** — mid grey, drawn last so an outage is never hidden under
 *   a run of in-stall time that only appears to span it
 *
 * The part of today that has not happened yet is a dashed outline, so the row
 * reads as unfinished rather than as a horse that has been out since lunch.
 *
 * Tapping a row opens the same panel the For You weekly view uses, with the
 * same wording — "Tuesday · 17 h 50 min · Out 8:30 AM – 12:10 PM" — so the
 * strip is never the only source of a fact. Hand-built for the reasons
 * recorded in PRINCIPLES.md under "Recorded exceptions to native over custom".
 */

const STRIP_HEIGHT = 12;
const ROW_GAP = 10;
const LABEL_WIDTH = 44;
/** Apple's minimum comfortable target; the strip is far thinner than a finger. */
const MIN_TAP_HEIGHT = 44;

export interface HorseInStallStripProps {
  data: StripModel;
  width: number;
  /**
   * Shown under the chart when the rows cannot yet be tied to the stall the
   * horse was actually in on each day (defect CQ-8). Omitted once the backend
   * supplies dated assignment history.
   */
  sourceNote?: string;
  testID?: string;
}

export function HorseInStallStrip({ data, width, sourceNote, testID }: HorseInStallStripProps) {
  const { colors, type, space, radius } = useTokens();
  const { rows, summary, zone } = data;
  const state = lyingDownStatePresentation(
    summary.state,
    summary.verdict,
    summary,
    IN_STALL_READINGS,
  );
  const [openKey, setOpenKey] = useState<string | null>(null);

  const figure =
    state.blocksContent || summary.dailyAverageSeconds === null
      ? '—'
      : formatDurationCompact(summary.dailyAverageSeconds);

  // Same words and the same kind of number as the For You weekly row, so a
  // customer who learned it there reads it here without re-learning.
  const subline = state.blocksContent
    ? undefined
    : summary.dailyAverageSeconds === null
      ? 'no complete day observed'
      : summary.observedDays < summary.days.length - 1
        ? `a day, over the ${summary.observedDays} days we could see`
        : summary.usualDailyAverageSeconds === null
          ? 'a day, no average yet'
          : `a day, ${formatDuration(summary.usualDailyAverageSeconds)} avg`;

  const trackWidth = Math.max(0, width - LABEL_WIDTH);
  const open = rows.find((row) => row.key === openKey) ?? null;
  const detail = open ? weeklyDayDetail(open.detail, zone, IN_STALL) : null;
  const axis = rows[0] ? barnDayAxisLabels(rows[0].start, rows[0].nextMidnight, zone) : [];

  return (
    <LyingDownRowShell
      horseName="Horse in Stall"
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
        <Pressable
          testID={testID}
          accessible={false}
          // Anything that is not a row closes the panel.
          onPress={() => setOpenKey(null)}
          style={{ marginTop: space.md }}>
          {rows.map((row) => (
            <StripRow
              key={row.key}
              row={row}
              trackWidth={trackWidth}
              selected={openKey === row.key}
              dimmed={openKey !== null && openKey !== row.key}
              onPress={() => setOpenKey(openKey === row.key ? null : row.key)}
              label={weeklyDayDetail(row.detail, zone, IN_STALL)}
            />
          ))}

          <View style={[styles.axis, { marginLeft: LABEL_WIDTH, width: trackWidth }]}>
            {axis.map((label, index) => (
              <Text key={`${index}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
                {label}
              </Text>
            ))}
          </View>

          {detail ? (
            <View
              testID="horse-in-stall-strip-detail"
              style={[
                styles.panel,
                {
                  marginTop: space.md,
                  padding: space.md,
                  borderRadius: radius.sm,
                  backgroundColor: colors.bed,
                },
              ]}>
              <Text style={[type.caption, styles.panelTitle, { color: colors.foreground }]}>
                {detail.title}
              </Text>
              {detail.detail ? (
                <Text style={[type.caption, { color: colors.secondary }]}>{detail.detail}</Text>
              ) : null}
            </View>
          ) : null}

          {sourceNote ? (
            <Text style={[type.caption, { color: colors.tertiary, marginTop: space.md }]}>
              {sourceNote}
            </Text>
          ) : null}
        </Pressable>
      </ChartStateSurface>
    </LyingDownRowShell>
  );
}

function StripRow({
  row,
  trackWidth,
  selected,
  dimmed,
  onPress,
  label,
}: {
  row: HorseInStallStripRow;
  trackWidth: number;
  selected: boolean;
  dimmed: boolean;
  onPress: () => void;
  label: { title: string; detail?: string };
}) {
  const { colors, type } = useTokens();
  const span = row.nextMidnight - row.start;
  const at = (seconds: number) =>
    span <= 0 ? 0 : Math.min(1, Math.max(0, (seconds - row.start) / span));
  const elapsed = at(row.upTo);

  return (
    <Pressable
      testID={`horse-in-stall-strip-row-${row.key}`}
      accessibilityRole="button"
      // The label carries the same facts as the panel, so a screen reader
      // never depends on a panel appearing.
      accessibilityLabel={[label.title, label.detail].filter(Boolean).join('. ')}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, { minHeight: MIN_TAP_HEIGHT * 0.6, opacity: dimmed ? 0.4 : 1 }]}>
      <Text
        style={[
          type.micro,
          styles.label,
          { color: selected || row.isToday ? colors.foreground : colors.tertiary },
        ]}
        numberOfLines={1}>
        {row.label}
      </Text>

      <View style={[styles.track, { width: trackWidth, backgroundColor: colors.chartBand }]}>
        {row.inStall.map((stretch) => (
          <View
            key={`in-${stretch.enter}`}
            style={[
              styles.run,
              {
                left: at(stretch.enter) * trackWidth,
                width: Math.max(3, (at(stretch.exit) - at(stretch.enter)) * trackWidth),
                backgroundColor: colors.chartData,
              },
            ]}
          />
        ))}
        {row.unobserved.map((gap) => (
          <View
            key={`gap-${gap.enter}`}
            style={[
              styles.run,
              {
                left: at(gap.enter) * trackWidth,
                width: Math.max(2, (at(gap.exit) - at(gap.enter)) * trackWidth),
                backgroundColor: colors.chartTrack,
              },
            ]}
          />
        ))}
        {row.isToday && elapsed < 1 ? (
          <View
            testID="horse-in-stall-strip-remaining"
            style={[
              styles.run,
              styles.remaining,
              {
                left: elapsed * trackWidth,
                width: (1 - elapsed) * trackWidth,
                borderColor: colors.chartTrack,
              },
            ]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: ROW_GAP },
  label: { width: LABEL_WIDTH },
  track: {
    height: STRIP_HEIGHT,
    borderRadius: STRIP_HEIGHT / 2,
    overflow: 'hidden',
  },
  run: {
    position: 'absolute',
    top: 0,
    height: STRIP_HEIGHT,
    borderRadius: STRIP_HEIGHT / 2,
  },
  remaining: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  panel: {},
  panelTitle: { fontWeight: '600' },
});
