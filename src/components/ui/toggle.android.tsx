import { Host } from '@expo/ui';
import { Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import { testID as testIDModifier } from '@expo/ui/jetpack-compose/modifiers';

import { useTokens } from '@/hooks/use-tokens';
import { TOGGLE_HEIGHT, TOGGLE_WIDTH, type ToggleProps } from '@/components/ui/toggle-types';

/**
 * Android half of the universal `Toggle` (surface layer): Material 3 switch,
 * track coloured with the theme accent so both platforms speak the same
 * accent, each in its own idiom.
 */
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  tint,
  testID,
}: ToggleProps) {
  const { colors } = useTokens();
  return (
    <Host
      style={{ width: TOGGLE_WIDTH, height: TOGGLE_HEIGHT }}
      testID={testID}
      accessibilityLabel={accessibilityLabel}>
      <ComposeSwitch
        value={value}
        onCheckedChange={disabled ? undefined : onValueChange}
        enabled={!disabled}
        colors={{
          checkedTrackColor: tint ?? colors.inverse,
          checkedThumbColor: colors.card,
          uncheckedTrackColor: colors.fillTonal,
          uncheckedThumbColor: colors.card,
          uncheckedBorderColor: colors.divider,
        }}
        modifiers={testID ? [testIDModifier(testID)] : undefined}
      />
    </Host>
  );
}
