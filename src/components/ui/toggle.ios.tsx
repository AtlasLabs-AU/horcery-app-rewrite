import { Host } from '@expo/ui';
import { Toggle as SwiftUIToggle } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as a11yLabel,
  disabled as disabledModifier,
  labelsHidden,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { useTokens } from '@/hooks/use-tokens';
import { TOGGLE_HEIGHT, TOGGLE_WIDTH, type ToggleProps } from '@/components/ui/toggle-types';

/**
 * iOS half of the universal `Toggle` (surface layer): the SwiftUI switch,
 * label hidden (the row supplies the words), tinted with the theme accent.
 */
export function Toggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  tint: tintColor,
  testID,
}: ToggleProps) {
  const { colors } = useTokens();
  return (
    <Host style={{ width: TOGGLE_WIDTH, height: TOGGLE_HEIGHT }} testID={testID}>
      <SwiftUIToggle
        isOn={value}
        onIsOnChange={onValueChange}
        label={accessibilityLabel}
        modifiers={[
          labelsHidden(),
          tint(tintColor ?? colors.inverse),
          a11yLabel(accessibilityLabel),
          ...(disabled ? [disabledModifier(true)] : []),
        ]}
      />
    </Host>
  );
}
