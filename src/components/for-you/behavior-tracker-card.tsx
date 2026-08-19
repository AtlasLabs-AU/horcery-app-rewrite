import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { SplitRow } from '@/components/ui/split-row';
import { ChartPlaceholder } from '@/components/for-you/chart-placeholder';
import { LyingDownRow } from '@/components/charts/lying-down-row';
import { buildLyingDownWeek, dayStartHourFrom } from '@/charts/lying-down';
import {
  inStallOvernight,
  inStallWithTurnout,
  monitorWentOffline,
  lowToday,
  settledSleeper,
  typicalWeek,
} from '@/charts/fixtures/lying-down';
import { PREVIEWS } from '@/config/previews';
import { LinkButton } from '@/components/for-you/link-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { TextTabs } from '@/components/ui/text-tabs';
import { useSession } from '@/hooks/use-session';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export type TrackerPeriod = 'daily' | 'weekly';

/**
 * Fallback zone, used only until the organization record arrives. The zone and
 * the barn-day start both belong to the organization (`timezone` and
 * `chart_start_time`), which is where the shipping app reads them from too.
 */
const FALLBACK_ZONE = 'America/Chicago';
/**
 * Fallback only, used for the single frame before the container reports its
 * real width. It used to be the actual value passed to every row, which pinned
 * each row ~48 pt short of the card on a large phone: the hairline between
 * horses is drawn on the full-width wrapper, so the chart beside it looked cut
 * off on the right. Measure, never assume.
 */
const CARD_WIDTH_FALLBACK = 320;

const PERIOD_OPTIONS: { label: string; value: TrackerPeriod }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

const TRACKER_MENU_ACTIONS = [
  { id: 'customize', label: 'Customize', icon: 'customize' as const, disabled: true },
  { id: 'history', label: 'See History', icon: 'clock' as const, disabled: true },
];

export interface Behavior {
  id: string;
  label: string;
  /** Surface-layer icon standing in for the current app's custom artwork. */
  icon: IconName;
}

const DEFAULT_BEHAVIORS: Behavior[] = [
  { id: 'lying-down', label: 'Lying Down', icon: 'lyingDown' },
  { id: 'people-in-stall', label: 'People in Stall', icon: 'peopleInStall' },
  { id: 'in-stall', label: 'In Stall', icon: 'inStall' },
  { id: 'feed', label: 'Feed', icon: 'feed' },
];

/**
 * Behavior Tracker — period tabs, behaviour selector, and the chart for the
 * selected behaviour. Chart stubbed pending the charting decision.
 *
 * Editorial pass (Inakshi, 2026-08-17 — "the white slab is the biggest
 * issue"): selection is shown by TONE and WEIGHT, never by an inverted
 * block. The chosen behaviour sits in a light well with an ink icon and a
 * headline-weight label; the others are bare icons in grey. Daily / Weekly
 * are text tabs rather than a filled segmented control, so the card has one
 * selection idiom. The ⋮ sits flush right after the tabs, on the title line.
 */
export function BehaviorTrackerCard({
  behaviors = DEFAULT_BEHAVIORS,
  onSwitchToStalls,
  previewTrends,
  previewLabels,
}: {
  behaviors?: Behavior[];
  onSwitchToStalls?: () => void;
  previewTrends?: Readonly<
    Record<string, Partial<Record<TrackerPeriod, readonly number[]>>>
  >;
  previewLabels?: readonly string[];
}) {
  const { colors } = useTokens();
  const [period, setPeriod] = useState<TrackerPeriod>('daily');
  const [selectedId, setSelectedId] = useState(behaviors[0]?.id);
  const [rowWidth, setRowWidth] = useState(CARD_WIDTH_FALLBACK);
  const { organization } = useSession();
  const zone = organization?.timezone || FALLBACK_ZONE;
  // The customer owns the barn day. 6 AM is only what we fall back to.
  const dayStartHour = dayStartHourFrom(organization?.chart_start_time);
  const selected = behaviors.find((b) => b.id === selectedId) ?? behaviors[0];

  // Fixture-backed until the observation API exists. Gated so it can never
  // reach a customer, and labelled so it cannot be mistaken for this horse's
  // real data even on Inakshi's own device.
  const sampleHorses = useMemo(() => {
    if (!PREVIEWS.lyingDownSampleData) return null;
    /**
     * The sample clock is pinned to 05:00 — late in the barn day, after the
     * night's rest — so the preview always shows a complete day.
     *
     * Tied to the real clock it showed four zeros for the whole hour after the
     * 06:00 rollover, which is correct behaviour and useless as a preview: you
     * cannot judge a chart with nothing in it. Pinning also makes the preview
     * deterministic, so two screenshots taken hours apart are comparable.
     *
     * The live chart uses the real clock. The empty-early-morning state this
     * hides is a genuine open question — a horse an hour into the barn day is
     * badged "Usual" on the strength of no observations at all — and it is
     * logged for Data Science alongside the thresholds, not papered over here.
     */
    const now = DateTime.now()
      .setZone(zone)
      .startOf('day')
      .plus({ hours: dayStartHour === 0 ? 23 : dayStartHour - 1 });
    const build = (
      result: ReturnType<typeof typicalWeek>,
      inStall?: ReturnType<typeof typicalWeek>,
    ) =>
      buildLyingDownWeek({
        result,
        inStallResult: inStall,
        selectedDate: now.toFormat('yyyy-MM-dd'),
        zone,
        dayStartHour,
        now,
      });
    // Verdict and average come from the backend in production. These are
    // stand-ins so the layout can be judged, including the states that matter:
    // a low day, and a monitor that went offline.
    // Typical cumulative progress through the barn day. Horses take most of
    // their rest overnight, so the curve is nearly flat through the afternoon
    // and steepens after dark — which is why a flat band would be wrong.
    // In production these points come from `dailyLyingDownAvg`, which already
    // returns cumulative averages at six-hour checkpoints.
    const curve = (avg: number) =>
      [
        [0, 0],
        [0.25, 0.06],
        [0.5, 0.16],
        [0.7, 0.38],
        [0.85, 0.72],
        [1, 1],
      ].map(([fractionOfDay, share]) => ({
        fractionOfDay: fractionOfDay!,
        lowSeconds: avg * share! * 0.72,
        highSeconds: avg * share! * 1.28,
      }));
    /**
     * The sample average is measured from the sample week, never invented.
     *
     * Hardcoding it put both "Usual" horses well below their own usual line, so
     * the badge said one thing and the picture said the opposite — on screen it
     * read as a bug in the chart. Sample data that contradicts itself hides real
     * contradictions, which is the same trap that produced the impossible
     * in-stall denominator. Completed days only: today is still in progress and
     * would drag the mean down.
     */
    const measuredAverage = (week: ReturnType<typeof build>) => {
      const completed = week.days
        .filter((d) => d !== week.today && d.totalSeconds !== null)
        .map((d) => d.totalSeconds as number);
      if (completed.length === 0) return null;
      return completed.reduce((a, b) => a + b, 0) / completed.length;
    };

    const horse = (
      name: string,
      verdict: 'usual' | 'low' | 'no-data',
      week: ReturnType<typeof build>,
      withRange: boolean,
    ) => {
      const avg = measuredAverage(week);
      return {
        name,
        verdict,
        avg,
        week,
        range: withRange && avg !== null ? curve(avg) : undefined,
      };
    };

    return [
      horse('Apollo', 'usual', build(typicalWeek(now), inStallWithTurnout(now)), true),
      horse('Bubbles', 'usual', build(settledSleeper(now), inStallOvernight(now)), true),
      horse('Juniper', 'low', build(lowToday(now), inStallWithTurnout(now)), true),
      horse('Pepper', 'no-data', build(monitorWentOffline(now)), false),
    ];
  }, [zone, dayStartHour]);

  return (
    <SectionCard testID="for-you-behavior-tracker">
      <SectionHeader
        title="Behavior Tracker"
        action={
          <View style={styles.headerActions}>
            <TextTabs
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
              testID="for-you-tracker-period"
            />
            <Menu
              icon="overflow"
              accessibilityLabel="Behavior tracker options"
              testID="for-you-tracker-menu"
              actions={TRACKER_MENU_ACTIONS}
            />
          </View>
        }
      />

      <View style={styles.behaviorRow}>
        {behaviors.map((behavior) => {
          const isSelected = behavior.id === selected?.id;
          return (
            <Pressable
              key={behavior.id}
              onPress={() => setSelectedId(behavior.id)}
              accessibilityRole="button"
              accessibilityLabel={behavior.label}
              accessibilityState={{ selected: isSelected }}
              testID={`for-you-behavior-${behavior.id}`}
              style={[
                styles.behaviorTile,
                isSelected && { backgroundColor: colors.bed },
              ]}>
              <Icon
                name={behavior.icon}
                size={22}
                color={isSelected ? colors.foreground : colors.tertiary}
              />
              {/*
                "Lying Down" and "People in Stall" are two words each; on one
                line they became "Lying Do…" and "People in…" one notch above
                the default text size. Two lines, centred, and the tile grows.
              */}
              <Text
                style={[
                  type.caption,
                  styles.behaviorLabel,
                  isSelected && styles.selectedCaption,
                  { color: isSelected ? colors.foreground : colors.tertiary },
                ]}
                numberOfLines={2}>
                {behavior.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SplitRow
        style={styles.selectedRow}
        leading={
          <Text style={[type.title3, styles.selectedLabel, { color: colors.foreground }]}>
            {selected?.label}
          </Text>
        }
        trailing={
          <LinkButton
            label="Switch to Stalls"
            onPress={onSwitchToStalls}
            testID="for-you-tracker-switch"
          />
        }
      />

      {selected?.id === 'lying-down' && sampleHorses ? (
        <View
          testID="for-you-tracker-chart"
          onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
          {sampleHorses.map((horse, index) => (
            <View
              key={horse.name}
              style={
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }
                  : undefined
              }>
              <LyingDownRow
                horseName={horse.name}
                week={horse.week}
                verdict={horse.verdict}
                averageSeconds={horse.avg}
                usualCurve={horse.range}
                width={rowWidth}
              />
            </View>
          ))}
          <Text style={[type.footnote, styles.sampleNotice, { color: colors.tertiary }]}>
            Sample data — not this horse
          </Text>
        </View>
      ) : (
      <ChartPlaceholder
        height={168}
        previewSeries={
          selected
            ? [
                {
                  label: selected.label,
                  color: colors.accent,
                  values: previewTrends?.[selected.id]?.[period] ?? [],
                },
              ]
            : undefined
        }
        xLabels={previewLabels}
        testID="for-you-tracker-chart"
      />
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  behaviorRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.sm,
    marginTop: space.edge,
  },
  behaviorTile: {
    flex: 1,
    minHeight: 64,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    gap: space.xs,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  behaviorLabel: { textAlign: 'center' },
  selectedCaption: { fontWeight: '600' },
  sampleNotice: { marginTop: 8, textAlign: 'center' },
  selectedRow: {
    marginTop: space.edge,
  },
  selectedLabel: {
    flexShrink: 1,
  },
});
