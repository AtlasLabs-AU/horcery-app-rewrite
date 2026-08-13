import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * The screen's one committing action (R4): an inverse capsule — near-black on
 * light, near-white on dark — 54pt tall. `secondary` renders the quiet
 * companion action (tonal fill, same geometry).
 *
 * The brief also asks for a medium-impact haptic on press; that waits on
 * adding `expo-haptics` (logged, not silently skipped).
 */
export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  secondary,
  testID,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  const { colors } = useTokens();
  const background = secondary ? colors.fillTonal : colors.inverse;
  const foreground = secondary ? colors.accent : colors.onInverse;
  const blocked = disabled || loading;

  return (
    <Pressable
      onPress={blocked ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        pressed && !blocked && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}>
      <View style={styles.contentRow}>
        {loading ? <ActivityIndicator size="small" color={foreground} /> : null}
        <Text style={[type.headline, { color: foreground }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
