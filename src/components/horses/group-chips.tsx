import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Menu } from '@/components/ui/menu';
import type { HorseGroup } from '@/hooks/use-horse-groups';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export const ALL_HORSES = 'all';

/**
 * The group filter row: "All Horses" plus one chip per group, and a visible
 * ⋮ at the end for Add horse / New group / Edit groups.
 *
 * The current app hides group editing behind a LONG-PRESS on a chip, which
 * nothing on screen hints at. The ⋮ replaces that (Inakshi, 2026-08-16); its
 * actions are disabled until the write side exists, but present so the row
 * reads as designed.
 */
export function GroupChips({
  groups,
  selectedId,
  onSelect,
  isLoading = false,
}: {
  groups: HorseGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}) {
  const { colors } = useTokens();
  const chips = [{ id: ALL_HORSES, name: 'All Horses' }, ...groups];

  return (
    <View style={styles.row}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.scroll}>
        {isLoading
          ? [0, 1, 2].map((item) => <View key={item} style={[styles.chip, styles.skeletonChip, { backgroundColor: colors.fillTonal }]} />)
          : chips.map((chip) => {
          const selected = chip.id === selectedId;
          return (
            <Pressable
              key={chip.id}
              onPress={() => onSelect(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`horse-group-${chip.id}`}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? colors.accent : colors.card,
                  borderColor: selected ? colors.accent : colors.divider,
                },
                pressed && { opacity: 0.85 },
              ]}>
              <Text
                style={[
                  type.subhead,
                  selected && styles.selectedText,
                  // onAccent, not onInverse: the chip is filled with `accent`,
                  // which is near-WHITE in dark mode — onInverse is also white,
                  // so the selected chip read white-on-white (caught on device
                  // 2026-08-17).
                  { color: selected ? colors.onAccent : colors.foreground },
                ]}
                numberOfLines={1}>
                {chip.name}
              </Text>
            </Pressable>
          );
          })}
      </ScrollView>
      <Menu
        icon="add"
        accessibilityLabel="Add horse or group"
        testID="horse-add-menu"
        width={44}
        height={44}
        title="Add to horses"
        actions={[
          { id: 'add-horse', label: 'Add Horse', description: 'Enter the horse details.', icon: 'add', onPress: () => router.push({ pathname: '/horses/horse-form', params: { mode: 'create' } }) },
          { id: 'new-group', label: 'New Group', description: 'Create a group for organising horses.', icon: 'group', onPress: () => router.push('/horses/group-form') },
        ]}
      />
      <Menu
        icon="overflow"
        accessibilityLabel="Group options"
        testID="horse-groups-menu"
        width={44}
        height={44}
        title="Horses and groups"
        actions={[
          {
            id: 'edit',
            label: 'Edit Groups',
            description: 'Rename or remove an existing group.',
            icon: 'edit',
            onPress: () => router.push('/horses/group-management'),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.edge,
    paddingRight: space.sm,
    gap: space.xs,
  },
  scroll: { flex: 1 },
  chips: { gap: space.sm, paddingRight: space.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonChip: { width: 104, borderWidth: 0 },
  selectedText: { fontWeight: '600' },
});
