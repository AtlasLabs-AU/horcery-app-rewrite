import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/icon-names';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/**
 * One of the two small tags on an alert row: who it applies to (horse/stall
 * glyph) or who it notifies (bell). Grey pill, ink text — no colour, per the
 * editorial palette. Decorative for a11y: the row's label already reads both.
 */
export function ScopeTag({ icon, label, testID }: { icon: IconName; label: string; testID?: string }) {
  const { colors } = useTokens();
  return (
    <View
      style={[styles.tag, { backgroundColor: colors.bed }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}>
      <Icon name={icon} size={12} color={colors.secondary} />
      <Text style={[type.caption, { color: colors.secondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    height: 24,
    borderRadius: radius.full,
  },
});
