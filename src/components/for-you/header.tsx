import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { space, type } from '@/constants/tokens';

/**
 * "Hello Horcery" plus the three header actions (search, customize, menu).
 *
 * The current app draws these as SVG assets; here they are SF Symbols via
 * `expo-symbols`, so they inherit the system weight and scale automatically.
 * Accessibility labels match the current app's so existing QA selectors and
 * screen-reader behaviour carry over.
 *
 * Each icon names its symbol per platform. A bare SF Symbol string renders as
 * nothing off iOS, which left the menu button — the only route to organization
 * switching and log out on web — as an invisible, zero-size pressable.
 */
export function ForYouHeader({
  greeting = 'Hello Horcery',
  onSearch,
  onCustomize,
  onMenu,
}: {
  greeting?: string;
  onSearch?: () => void;
  onCustomize?: () => void;
  onMenu?: () => void;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.row}>
      <Text style={[type.largeTitle, styles.greeting, { color: colors.foreground }]} numberOfLines={1}>
        {greeting}
      </Text>
      <View style={styles.actions}>
        <HeaderIcon
          name="search"
          label="Search"
          hint="Opens search"
          onPress={onSearch}
          testID="for-you-search-button"
        />
        <HeaderIcon
          name="customize"
          label="Customize for you page"
          onPress={onCustomize}
          testID="for-you-customize-button"
        />
        <HeaderIcon
          name="menu"
          label="Open menu"
          onPress={onMenu}
          testID="for-you-menu-button"
        />
      </View>
    </View>
  );
}

function HeaderIcon({
  name,
  label,
  hint,
  onPress,
  testID,
}: {
  name: IconName;
  label: string;
  hint?: string;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  const wired = !!onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={!wired}
      hitSlop={12}
      accessibilityRole={wired ? 'button' : undefined}
      accessibilityLabel={wired ? label : undefined}
      accessibilityHint={wired ? hint : undefined}
      accessibilityState={{ disabled: !wired }}
      testID={testID}
      style={({ pressed }) => (pressed && wired ? styles.pressed : undefined)}>
      <Icon name={name} size={24} color={wired ? colors.foreground : colors.dimmed} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  greeting: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  pressed: {
    opacity: 0.5,
  },
});
