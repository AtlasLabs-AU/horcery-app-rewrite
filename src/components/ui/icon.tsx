import { Host, Icon as UniversalIcon } from '@expo/ui';
import { SymbolView } from 'expo-symbols';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

import { androidDrawableFor } from '@/components/ui/icon-android-map';
import { iosSymbolFor } from '@/components/ui/icon-ios-map';
import type { IconName } from '@/components/ui/icon-names';
import { useTokens } from '@/hooks/use-tokens';

/**
 * The app's only icon component (surface layer — requirements §4d).
 *
 * Screens name icons **semantically** — `<Icon name="menu" />` — never with a
 * platform glyph id. The two maps beside this file are the single place where
 * a Horcery concept becomes an SF Symbol or a Material Symbol, which is what
 * lets a screen be written once and render natively on both platforms.
 *
 * Why it exists: screens previously passed bare SF Symbol strings to
 * `expo-symbols`, which renders **nothing** off iOS — the menu button, the
 * only route to organization switching and log out, was an invisible,
 * zero-size pressable on Android (requirements §6b, item 1).
 *
 * **Logged platform choice (sourcing hierarchy §4):** iOS draws through
 * `expo-symbols`, a plain native view, rather than the universal `@expo/ui`
 * `Icon`, because that one is a SwiftUI primitive needing a `Host` bridge per
 * icon — real cost on every list row (PRINCIPLES #2; tie-break smooth over
 * showy). Android has no lighter path to XML vector drawables, so it uses the
 * universal `Icon` inside a `Host` pinned to the glyph box. The `Platform`
 * branch is permitted because this IS the surface layer; callers cannot tell.
 */
export type { IconName };

export interface IconProps {
  name: IconName;
  size?: number;
  /** Defaults to the current foreground ink. */
  color?: string;
  /** Spoken name. Omit for icons that merely decorate a labelled control. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 20, color, accessibilityLabel, style }: IconProps) {
  const { colors } = useTokens();
  const tint = color ?? colors.foreground;

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={iosSymbolFor(name)}
        size={size}
        tintColor={tint}
        resizeMode="scaleAspectFit"
        accessibilityLabel={accessibilityLabel}
        style={style}
      />
    );
  }

  // Host does not size itself to its native child — pin it to the glyph box.
  return (
    <Host style={[{ width: size, height: size }, style]}>
      <UniversalIcon
        name={androidDrawableFor(name)}
        size={size}
        color={tint}
        accessibilityLabel={accessibilityLabel}
      />
    </Host>
  );
}
