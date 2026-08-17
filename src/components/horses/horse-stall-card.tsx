import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Which stall this horse is in, and the two things you would want to do about
 * it — open the stall, or move the horse.
 *
 * Both are visible and both are disabled, each saying why (requirements §6b
 * item 3). "Re-assign" is a write and the rewrite is read-only against
 * production; the stall row has nowhere to go until the Stalls page exists.
 * A control that is simply absent teaches nothing; one that is dimmed with a
 * reason lets the composition be judged and sets the expectation.
 *
 * The current app's instructional info box ("Navigate to the stall to view
 * operational data…") is not carried: the row's own label says it.
 */
export function HorseStallCard({ stallName }: { stallName?: string }) {
  const { colors } = useTokens();
  const assigned = !!stallName;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} testID="horse-stall-card">
      <View style={styles.headerRow}>
        <Text style={[type.title3, { color: colors.foreground }]}>Stall</Text>
        <View style={styles.disabledAction} testID="horse-stall-reassign">
          <Text style={[type.subhead, { color: colors.dimmed }]}>
            {assigned ? 'Re-assign' : 'Assign'}
          </Text>
        </View>
      </View>

      <View style={[styles.row, { backgroundColor: colors.bed }]} testID="horse-stall-row">
        <Icon
          name={assigned ? 'inStall' : 'info'}
          size={20}
          color={assigned ? colors.accent : colors.tertiary}
        />
        <View style={styles.rowText}>
          <Text
            style={[type.headline, { color: assigned ? colors.foreground : colors.secondary }]}
            numberOfLines={1}>
            {stallName ?? 'No stall assigned'}
          </Text>
          <Text style={[type.footnote, { color: colors.tertiary }]}>
            {assigned
              ? 'Stall page coming with the Stalls rebuild'
              : 'Assigning a stall comes with the write side'}
          </Text>
        </View>
        <Icon name="chevronRight" size={14} color={colors.dimmed} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.card,
    gap: space.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disabledAction: { minHeight: 32, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    opacity: 0.85,
  },
  rowText: { flex: 1, gap: space.xxs },
});
