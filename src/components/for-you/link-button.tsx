import { Pressable, StyleSheet, Text } from 'react-native';

import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';
import { space, type } from '@/constants/tokens';

/**
 * The accent text actions on For You — "Switch", "See History",
 * "Manage Alerts", "Switch to Stalls".
 *
 * When no handler is supplied the link still RENDERS, dimmed and inert, with
 * no button role for screen readers (Inakshi, 2026-08-15): the whole
 * composition has to be visible to sign off look and feel, and the honest
 * "visibly disabled" branch of the standing rule covers it. It lights up when
 * its destination is built.
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
  const wired = !!onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={!wired}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole={wired ? 'button' : undefined}
      accessibilityLabel={wired ? label : undefined}
      accessibilityState={{ disabled: !wired }}
      testID={testID}
      style={({ pressed }) => [styles.link, pressed && wired && styles.pressed]}>
      <Text
        style={[type.subhead, styles.label, { color: wired ? colors.accent : colors.dimmed }]}
        numberOfLines={1}>
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
    fontFamily: font.semibold,
  },
  pressed: {
    opacity: 0.5,
  },
});
