import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fyp, Spacing } from '@/constants/theme';

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
  return (
    <View style={styles.row}>
      <Text style={styles.greeting} numberOfLines={1}>
        {greeting}
      </Text>
      <View style={styles.actions}>
        <HeaderIcon
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          label="Search"
          hint="Opens search"
          onPress={onSearch}
          testID="for-you-search-button"
        />
        <HeaderIcon
          name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
          label="Customize for you page"
          onPress={onCustomize}
          testID="for-you-customize-button"
        />
        <HeaderIcon
          name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }}
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
  name: SymbolViewProps['name'];
  label: string;
  hint?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <SymbolView
        name={name}
        size={24}
        tintColor={Fyp.headerTitle}
        resizeMode="scaleAspectFit"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: Fyp.headerTitle,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  pressed: {
    opacity: 0.5,
  },
});
