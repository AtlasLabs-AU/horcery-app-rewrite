import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { ChartPlaceholder } from '@/components/for-you/chart-placeholder';
import { LinkButton } from '@/components/for-you/link-button';
import { OverflowMenu } from '@/components/for-you/overflow-menu';
import { SegmentedControl } from '@/components/for-you/segmented-control';
import { Brand, Fyp, Radius, Spacing } from '@/constants/theme';

export type TrackerPeriod = 'daily' | 'weekly';

const PERIOD_OPTIONS: { label: string; value: TrackerPeriod }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
];

export interface Behavior {
  id: string;
  label: string;
  /** SF Symbol standing in for the current app's custom behaviour artwork. */
  symbol: string;
}

const DEFAULT_BEHAVIORS: Behavior[] = [
  { id: 'lying-down', label: 'Lying Down', symbol: 'moon.zzz.fill' },
  { id: 'people-in-stall', label: 'People in Stall', symbol: 'figure.stand' },
  { id: 'in-stall', label: 'In Stall', symbol: 'house.fill' },
  // 'bucket.fill' is not a real SF Symbol — it rendered as an empty tile.
  { id: 'feed', label: 'Feed', symbol: 'fork.knife' },
];

/**
 * Behavior Tracker — period toggle, behaviour selector tiles, and the chart for
 * the selected behaviour.
 *
 * Chart stubbed pending the charting-library decision; everything around it is
 * real, so the card's height and scroll position match the current app.
 */
export function BehaviorTrackerCard({
  behaviors = DEFAULT_BEHAVIORS,
  onSwitchToStalls,
}: {
  behaviors?: Behavior[];
  onSwitchToStalls?: () => void;
}) {
  const [period, setPeriod] = useState<TrackerPeriod>('daily');
  const [selectedId, setSelectedId] = useState(behaviors[0]?.id);

  const selected = behaviors.find((b) => b.id === selectedId) ?? behaviors[0];

  return (
    <SectionCard testID="for-you-behavior-tracker">
      <SectionHeader
        title="Behavior Tracker"
        adornment={
          <OverflowMenu
            label="Behavior tracker options"
            testID="for-you-tracker-menu"
            actions={[
              { label: 'Customize', systemImage: 'slider.horizontal.3' },
              { label: 'See History', systemImage: 'clock.arrow.circlepath' },
            ]}
          />
        }
        action={
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            width={148}
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
              style={[styles.behaviorTile, isSelected && styles.behaviorTileOn]}>
              <SymbolView
                name={behavior.symbol as never}
                size={26}
                tintColor={isSelected ? '#FFFFFF' : Fyp.muted}
                resizeMode="scaleAspectFit"
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.selectedRow}>
        <Text style={styles.selectedLabel}>{selected?.label}</Text>
        <LinkButton
          label="Switch to Stalls"
          width={150}
          onPress={onSwitchToStalls}
          testID="for-you-tracker-switch"
        />
      </View>

      <ChartPlaceholder height={168} testID="for-you-tracker-chart" />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  behaviorRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    marginTop: Spacing.three,
  },
  behaviorTile: {
    flex: 1,
    height: 62,
    borderRadius: Radius.card,
    backgroundColor: Fyp.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  behaviorTileOn: {
    backgroundColor: Brand.primary,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  selectedLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: Fyp.title,
    flexShrink: 1,
  },
});
