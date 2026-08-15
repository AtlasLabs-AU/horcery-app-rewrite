import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { ChartPlaceholder } from '@/components/for-you/chart-placeholder';
import { LinkButton } from '@/components/for-you/link-button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
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

      <ChartPlaceholder height={168} testID="for-you-tracker-chart" />
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
