import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { SplitRow } from '@/components/ui/split-row';
import { ChartPlaceholder } from '@/components/for-you/chart-placeholder';
import { LinkButton } from '@/components/for-you/link-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { TextTabs } from '@/components/ui/text-tabs';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export type TrackerPeriod = 'daily' | 'weekly';

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
  const selected = behaviors.find((b) => b.id === selectedId) ?? behaviors[0];

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
  selectedRow: {
    marginTop: space.edge,
  },
  selectedLabel: {
    flexShrink: 1,
  },
});
