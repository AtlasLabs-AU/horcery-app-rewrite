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
        {/*
          Horcery's own horse mark, not a platform symbol. SF Symbols has no
          `horse`; the nearest is `figure.equestrian.sports` — a RIDER on a
          horse, which reads as an equestrian sport, and Material's `pets` is a
          paw print. This app is about stabled horses, and neither idea is
          right (Inakshi, 2026-08-17). Rasterised from the shipping app's
          `bottom-tabs/active.horse.svg` as a black alpha mask, so the tab
          tints it like the other icons on both platforms.
        */}
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/horse.png')}
          renderingMode="template"
        />
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
