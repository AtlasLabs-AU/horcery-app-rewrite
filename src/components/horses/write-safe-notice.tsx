import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

export function WriteSafeNotice() {
  const { colors } = useTokens();
  return (
    <View style={styles.row} accessibilityLabel="Preview only. Changes are not saved to the server.">
      <Icon name="info" size={16} color={colors.tertiary} />
      <Text style={[type.footnote, { color: colors.tertiary }]}>Preview only — changes are not saved yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.xs } });
