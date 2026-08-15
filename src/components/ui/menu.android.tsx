import { Host } from '@expo/ui';
import {
  DropdownMenu,
  DropdownMenuItem,
  Icon as ComposeIcon,
  Text as ComposeText,
  TextButton,
} from '@expo/ui/jetpack-compose';
import { useState } from 'react';

import { androidDrawableFor } from '@/components/ui/icon-android-map';
import type { MenuProps } from '@/components/ui/menu-types';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Android half of the universal `Menu` (surface layer). Material 3
 * `DropdownMenu` anchored to its trigger.
 *
 * Unlike SwiftUI's `Menu`, Compose's is a controlled component: it needs
 * `expanded` state and an explicit dismiss handler, which is why this file
 * holds state and the iOS one does not. Callers see neither.
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
  const [expanded, setExpanded] = useState(false);

  const run = (onPress?: () => void) => {
    setExpanded(false);
    onPress?.();
  };

  return (
    <Host style={{ width, height }} testID={testID} matchContents>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={() => setExpanded(false)}
        color={colors.card}>
        <DropdownMenu.Trigger>
          <TextButton
            onClick={() => setExpanded(true)}
            colors={{ contentColor: colors.accent }}>
            {label ? (
              <ComposeText>{label}</ComposeText>
            ) : icon ? (
              <ComposeIcon source={androidDrawableFor(icon)} size={20} tint={colors.accent} />
            ) : (
              <ComposeText>{''}</ComposeText>
            )}
          </TextButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              enabled={action.disabled !== true}
              onClick={() => run(action.onPress)}
              elementColors={{
                textColor: action.destructive ? colors.statusAlert : colors.foreground,
                leadingIconColor: colors.accent,
                trailingIconColor: colors.accent,
              }}>
              {action.icon ? (
                <DropdownMenuItem.LeadingIcon>
                  <ComposeIcon source={androidDrawableFor(action.icon)} size={20} />
                </DropdownMenuItem.LeadingIcon>
              ) : null}
              <DropdownMenuItem.Text>
                <ComposeText>{action.label}</ComposeText>
              </DropdownMenuItem.Text>
              {action.selected ? (
                <DropdownMenuItem.TrailingIcon>
                  <ComposeIcon source={androidDrawableFor('check')} size={18} />
                </DropdownMenuItem.TrailingIcon>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
