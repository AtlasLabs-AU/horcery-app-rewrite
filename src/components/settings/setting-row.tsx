import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/icon';
import { Toggle } from '@/components/ui/toggle';
import { useTokens } from '@/hooks/use-tokens';
import { motion, space, type } from '@/constants/tokens';

/**
 * A settings row whose ICON tells the truth about the state, not just the
 * switch (Inakshi, 2026-08-16):
 *
 * - on  → the icon is tinted with the accent;
 * - off → the icon goes dimmed AND, where the meaning changes, swaps to its
 *   "off" glyph (bell → bell.slash, video → video.slash), with a short
 *   crossfade so the change is seen rather than blinked.
 *
 * Every switch is the same quiet accent when on. Colour per row ("Sound is
 * orange") is decoration, and the editorial direction has none of it; the
 * icon carries the row's personality. The one allowed exception is a `tint`
 * for a switch whose OFF state is genuinely a warning — the caller says so.
 */
export function SettingRow({
  title,
  description,
  icon,
  offIcon,
  value,
  onValueChange,
  disabled,
  tint,
  last,
  testID,
}: {
  title: string;
  description?: string;
  icon: IconName;
  /** Glyph shown when off; defaults to the same glyph, dimmed. */
  offIcon?: IconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Only for a switch whose off state warrants a warning colour. */
  tint?: string;
  /** Suppresses the inset separator on the group's final row. */
  last?: boolean;
  testID?: string;
}) {
  const { colors } = useTokens();
  const glyph = value ? icon : (offIcon ?? icon);

  return (
    <View style={styles.row} testID={testID}>
      {/* Bare icon, no well (editorial pass): the tint and glyph carry the
          state; a tinted circle behind it was one container too many. Keyed
          on the glyph so a change mounts a fresh view and crossfades. */}
      <View style={styles.iconSlot}>
        <Animated.View
          key={glyph}
          entering={FadeIn.duration(motion.fast)}
          exiting={FadeOut.duration(motion.fast)}>
          <Icon name={glyph} size={20} color={value ? (tint ?? colors.accent) : colors.dimmed} />
        </Animated.View>
      </View>

      <View style={[styles.text, !last && { borderBottomColor: colors.divider }, !last && styles.separator]}>
        <View style={styles.words}>
          <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
          {description ? (
            <Text style={[type.footnote, { color: colors.tertiary }]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <Toggle
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          tint={tint}
          accessibilityLabel={title}
          testID={testID ? `${testID}-toggle` : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.edge,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingRight: space.edge,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth },
  words: { flex: 1, gap: space.xxs },
});
