import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { ChartPlaceholder } from '@/components/for-you/chart-placeholder';
import { LyingDownRow } from '@/components/charts/lying-down-row';
import { buildLyingDownWeek } from '@/charts/lying-down';
import {
  inStallOvernight,
  inStallWithTurnout,
  monitorWentOffline,
  outMostOfDay,
  settledSleeper,
  typicalWeek,
} from '@/charts/fixtures/lying-down';
import { PREVIEWS } from '@/config/previews';
import { LinkButton } from '@/components/for-you/link-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export type TrackerPeriod = 'daily' | 'weekly';

/** Organization zone. Comes from the org profile once the API is wired. */
const ZONE = 'America/Chicago';
/** Card content width inside the section's padding. */
const CARD_WIDTH = 320;

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
 * Behavior Tracker — period toggle, behaviour selector tiles, and the chart for
 * the selected behaviour. Chart stubbed pending the charting decision.
 *
 * Header carries the ⋮ menu beside the title (as the current app does) and the
 * native segmented control flush right, both on the title line.
 */
export function BehaviorTrackerCard({
  behaviors = DEFAULT_BEHAVIORS,
  onSwitchToStalls,
}: {
  behaviors?: Behavior[];
  onSwitchToStalls?: () => void;
}) {
  const { colors } = useTokens();
  const [period, setPeriod] = useState<TrackerPeriod>('daily');
  const [selectedId, setSelectedId] = useState(behaviors[0]?.id);
  const selected = behaviors.find((b) => b.id === selectedId) ?? behaviors[0];

  // Fixture-backed until the observation API exists. Gated so it can never
  // reach a customer, and labelled so it cannot be mistaken for this horse's
  // real data even on Inakshi's own device.
  const sampleHorses = useMemo(() => {
    if (!PREVIEWS.lyingDownSampleData) return null;
    const now = DateTime.now().setZone(ZONE);
    const build = (
      result: ReturnType<typeof typicalWeek>,
      inStall?: ReturnType<typeof typicalWeek>,
    ) =>
      buildLyingDownWeek({
        result,
        inStallResult: inStall,
        selectedDate: now.toFormat('yyyy-MM-dd'),
        zone: ZONE,
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
    return [
      {
        name: 'Apollo', verdict: 'usual' as const, avg: 2.6 * 3600,
        week: build(typicalWeek(now), inStallWithTurnout(now)), range: curve(2.6 * 3600),
      },
      {
        name: 'Bubbles', verdict: 'usual' as const, avg: 4.1 * 3600,
        week: build(settledSleeper(now), inStallOvernight(now)), range: curve(4.1 * 3600),
      },
      {
        name: 'Juniper', verdict: 'low' as const, avg: 2.9 * 3600,
        week: build(outMostOfDay(now), inStallWithTurnout(now)), range: curve(2.9 * 3600),
      },
      {
        name: 'Pepper', verdict: 'no-data' as const, avg: 2.6 * 3600,
        week: build(monitorWentOffline(now)), range: undefined,
      },
    ];
  }, []);

  return (
    <SectionCard testID="for-you-behavior-tracker">
      <SectionHeader
        title="Behavior Tracker"
        adornment={
          <Menu
            icon="overflow"
            accessibilityLabel="Behavior tracker options"
            testID="for-you-tracker-menu"
            actions={TRACKER_MENU_ACTIONS}
          />
        }
        action={
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            width={132}
            testID="for-you-tracker-period"
          />
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
                { backgroundColor: isSelected ? colors.accent : colors.fillTonal },
              ]}>
              <Icon
                name={behavior.icon}
                size={26}
                color={isSelected ? colors.onInverse : colors.secondary}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedRow}>
        <Text style={[type.headline, styles.selectedLabel, { color: colors.foreground }]}>
          {selected?.label}
        </Text>
        {onSwitchToStalls ? (
          <LinkButton
            label="Switch to Stalls"
            onPress={onSwitchToStalls}
            testID="for-you-tracker-switch"
          />
        ) : null}
      </View>

      {selected?.id === 'lying-down' && sampleHorses ? (
        <View testID="for-you-tracker-chart">
          {sampleHorses.map((horse, index) => (
            <View
              key={horse.name}
              style={index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' } : undefined}>
              <LyingDownRow
                horseName={horse.name}
                week={horse.week}
                verdict={horse.verdict}
                averageSeconds={horse.avg}
                usualCurve={horse.range}
                width={CARD_WIDTH}
              />
            </View>
          ))}
          <Text style={[type.footnote, styles.sampleNotice, { color: colors.tertiary }]}>
            Sample data — not this horse
          </Text>
        </View>
      ) : (
        <ChartPlaceholder height={168} testID="for-you-tracker-chart" />
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  behaviorRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.edge,
  },
  behaviorTile: {
    flex: 1,
    height: 62,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleNotice: { marginTop: 8, textAlign: 'center' },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.edge,
    gap: space.sm,
  },
  selectedLabel: {
    flexShrink: 1,
  },
});
