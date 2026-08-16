import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/** Makes the development-only sample state impossible to mistake for live data. */
export function ForYouPreviewBanner() {
  const { colors } = useTokens();
  return (
    <View
      style={[styles.banner, { backgroundColor: colors.fillTonal }]}
      testID="for-you-sample-banner">
      <Icon name="info" size={15} color={colors.accent} />
      <Text style={[type.footnote, styles.text, { color: colors.secondary }]}>
        Sample data fills unfinished sections. Your organization data is unchanged.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    marginHorizontal: space.edge,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  text: { flex: 1 },
});
