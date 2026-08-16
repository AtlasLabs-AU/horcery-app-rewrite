import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTokens } from '@/hooks/use-tokens';

/**
 * The tab bar reads TOKENS (editorial pass, 2026-08-17): before, it read
 * the scaffold's Colors and stayed brand indigo in every theme variant.
 * Selected = ink; unselected = tertiary grey. Background is left to the
 * system so iOS 26 keeps its glass.
 */
export default function AppTabs() {
  const { colors } = useTokens();

  return (
    <NativeTabs
      tintColor={colors.foreground}
      iconColor={{ default: colors.tertiary, selected: colors.foreground }}
      indicatorColor={colors.fillTonal}
      labelStyle={{
        default: { color: colors.tertiary },
        selected: { color: colors.foreground },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="horses">
        <NativeTabs.Trigger.Label>Horses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.equestrian.sports" md="pets" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Protos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
