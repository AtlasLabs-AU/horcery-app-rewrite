import { Switch } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import type { ToggleProps } from '@/components/ui/toggle-types';

export type { ToggleProps } from '@/components/ui/toggle-types';
export { TOGGLE_HEIGHT, TOGGLE_WIDTH } from '@/components/ui/toggle-types';

/**
 * Universal `Toggle` — an on/off switch.
 *
 * This base file is the WEB / test fallback and the type surface TypeScript
 * reads. The real implementations are `toggle.ios.tsx` (SwiftUI `Toggle`)
 * and `toggle.android.tsx` (Material 3 `Switch`); Metro picks per platform.
 *
 * Unlike `Menu`, a switch has a faithful React Native primitive on web, so
 * the fallback is a working control rather than nothing.
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
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: tint ?? colors.inverse, false: colors.fillTonal }}
      thumbColor={colors.card}
      testID={testID}
    />
  );
}
