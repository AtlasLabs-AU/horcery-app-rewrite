import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import type { Drift } from '@/domain/alerts/types';
import { driftLabel } from '@/domain/alerts/view';
import { useTokens } from '@/hooks/use-tokens';

/**
 * "Shifted 1 h since the clocks changed" — the one place `statusAlert` is
 * allowed on this page, because it is a real problem with the customer's
 * alert, not decoration (architecture §7.3, PRINCIPLES "Colour").
 */
export function DriftBadge({ drift, testID }: { drift: Drift; testID?: string }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.badge, { borderColor: colors.statusAlert }]} testID={testID}>
      <Icon name="clock" size={12} color={colors.statusAlert} />
      <Text style={[type.caption, { color: colors.statusAlert }]} numberOfLines={1}>
        {driftLabel(drift)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    height: 24,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
});
