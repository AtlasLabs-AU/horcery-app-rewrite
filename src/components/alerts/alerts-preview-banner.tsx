import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

export function AlertsPreviewBanner() {
  const { colors } = useTokens();
  return (
    <View style={[styles.banner, { backgroundColor: colors.fillTonal }]} testID="alerts-sample-banner">
      <Icon name="info" size={15} color={colors.accent} />
      <Text style={[type.footnote, styles.text, { color: colors.secondary }]}>
        Sample alerts are shown for design review. Your organization data is unchanged.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.edge,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  text: { flex: 1 },
});
