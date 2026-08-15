import { Pressable, StyleSheet, Text } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { space, type } from '@/constants/tokens';

/**
 * The accent text actions on For You — "Switch", "See History",
 * "Manage Alerts", "Switch to Stalls".
 *
 * Previously a native `@expo/ui` Button inside a fixed-width `Host`. `Host`
 * does not size itself, so every label needed a hand-tuned width — and when
 * the label outgrew it, the row wrapped and the link dropped below its title
 * (the misalignment Inakshi flagged 2026-08-15). A text link is the one case
 * where the native control buys nothing the platform's own text-button
 * behaviour doesn't already give a Pressable: it lays out with the row, hits
 * 44pt through hitSlop, and reads its colour from tokens.
 * Principles: native-over-custom applies to *controls*; a link is text.
 */
export function LinkButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text style={[type.subhead, styles.label, { color: colors.accent }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
    marginRight: -space.xs,
  },
  label: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.5,
  },
});
