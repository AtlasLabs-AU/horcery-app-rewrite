import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
}: {
  groups: HorseGroup[];
  selectedId: string;
  onSelect: (id: string) => void;
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
        {chips.map((chip) => {
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
        actions={[
          { id: 'add', label: 'Add Horse — coming soon', icon: 'add', disabled: true },
          { id: 'new', label: 'New Group — coming soon', icon: 'add', disabled: true },
          { id: 'edit', label: 'Edit Groups — coming soon', icon: 'edit', disabled: true },
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
  selectedText: { fontWeight: '600' },
});
