import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/icon-names';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/**
 * "Apply to" / "Send alert to" — a row that opens the targets picker and
 * shows the current tag text. Disabled with no chevron and no button role in
 * read-only mode.
 */
export function ScopeRow({
  icon,
  title,
  value,
  onPress,
  disabled,
  error,
  testID,
}: {
  icon: IconName;
  title: string;
  value: string;
  onPress: () => void;
  disabled: boolean;
  error?: string;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={disabled ? undefined : 'button'}
        accessibilityLabel={`${title}: ${value}`}
        testID={testID}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.card },
          pressed && !disabled && { opacity: 0.9 },
        ]}>
        <Icon name={icon} size={20} color={colors.foreground} />
        <View style={styles.text}>
          <Text style={[type.headline, { color: colors.foreground }]}>{title}</Text>
          <Text style={[type.subhead, { color: colors.secondary }]}>{value}</Text>
        </View>
        {disabled ? null : <Icon name="chevronRight" size={13} color={colors.dimmed} />}
      </Pressable>
      {error ? (
        <Text style={[type.caption, styles.error, { color: colors.statusAlert }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.card,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  text: { flex: 1, gap: 2 },
  error: { marginTop: space.xs, marginLeft: space.card },
});
