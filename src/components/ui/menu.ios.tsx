import { Host } from '@expo/ui';
import { Button, Menu as SwiftUIMenu } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as a11yLabel,
  disabled as disabledModifier,
  foregroundStyle,
  rotationEffect,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { iosSymbolFor } from '@/components/ui/icon-ios-map';
import type { MenuProps } from '@/components/ui/menu-types';
import { useTokens } from '@/hooks/use-tokens';

/**
 * iOS half of the universal `Menu` (surface layer). SwiftUI `Menu` — anchored
 * to its trigger, dismissed by system rules, no sheet library.
 *
 * The ⋮ trigger is a rotated horizontal ellipsis: SF Symbols has no plain
 * vertical one, and 'ellipsis.vertical' is not a real symbol name (it renders
 * blank — found the hard way).
 */
export function Menu({
  actions,
  label,
  icon,
  accessibilityLabel,
  width = 32,
  height = 32,
  testID,
}: MenuProps) {
  const { colors } = useTokens();
  const isOverflow = icon === 'overflow';

  return (
    <Host style={{ width, height }} testID={testID}>
      <SwiftUIMenu
        label={label ?? ''}
        systemImage={label ? undefined : icon ? iosSymbolFor(icon) : undefined}
        modifiers={[
          tint(colors.accent),
          foregroundStyle(colors.accent),
          ...(isOverflow ? [rotationEffect(90)] : []),
          a11yLabel(accessibilityLabel),
        ]}>
        {actions.map((action) => (
          <Button
            key={action.id}
            label={action.label}
            systemImage={
              action.selected
                ? iosSymbolFor('check')
                : action.icon
                  ? iosSymbolFor(action.icon)
                  : undefined
            }
            role={action.destructive ? 'destructive' : 'default'}
            modifiers={action.disabled ? [disabledModifier(true)] : undefined}
            onPress={action.onPress}
          />
        ))}
      </SwiftUIMenu>
    </Host>
  );
}
