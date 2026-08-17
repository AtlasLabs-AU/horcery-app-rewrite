import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Menu } from '@/components/ui/menu';
import type { HorseGroup } from '@/hooks/use-horse-groups';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export const ALL_HORSES = 'all';

/**
 * The group filter row: a visible +, "All Horses" and one chip per group,
 * then a visible ⋮ for group editing.
 *
 * The current app hides group editing behind a LONG-PRESS on a chip, which
 * nothing on screen hints at, and puts a separate round "+" at the HEAD of the
 * row for Add Horse / New Group. Both are replaced by this one ⋮ (Inakshi,
 * 2026-08-16 and again 2026-08-17: "keep the single ⋮"). Its actions are
 * disabled until the write side exists, but present so the row reads as
 * designed.
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
          ? [0, 1, 2].map((item) => (
              <View
                key={item}
                style={[
                  styles.chip,
                  styles.skeletonChip,
                  { backgroundColor: colors.fillTonal },
                ]}
              />
            ))
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
        icon="overflow"
        accessibilityLabel="Group options"
        testID="horse-groups-menu"
        width={44}
        height={44}
        title="Horses and groups"
        actions={[
          {
            id: 'add',
            label: 'Add Horse',
            description: 'Coming soon — add a horse to your organisation.',
            icon: 'add',
            disabled: true,
          },
          {
            id: 'new',
            label: 'New Group',
            description: 'Coming soon — create a group to sort horses into.',
            icon: 'add',
            disabled: true,
          },
          {
            id: 'edit',
            label: 'Edit Groups',
            description: 'Coming soon — rename or delete a group.',
            icon: 'edit',
            disabled: true,
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
