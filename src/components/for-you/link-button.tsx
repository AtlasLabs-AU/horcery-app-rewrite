import { Button, Host } from '@expo/ui';
import { foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';

import { Brand } from '@/constants/theme';

/**
 * The purple text actions on For You — "Switch", "See History",
 * "Manage Alerts", "Switch to Stalls".
 *
 * In the current app these are gluestack `Button`s styled to look like links.
 * Here they are real native buttons (`@expo/ui` `Button variant="text"`), which
 * brings platform press feedback, correct hit targets, and accessibility
 * traits for free.
 *
 * Two notes carried over from the alerts demo:
 * - `<Host>` does not size itself to its native child, so the caller passes an
 *   explicit width and we fix the height here.
 * - The universal `Button` has no colour prop; tint arrives through the
 *   SwiftUI `tint()` modifier. The Jetpack Compose equivalent belongs in the
 *   shared surface layer when Android comes online.
 */
export function LinkButton({
  label,
  onPress,
  width,
  testID,
}: {
  label: string;
  onPress?: () => void;
  /** Explicit width; without it the native button collapses to nothing. */
  width: number;
  testID?: string;
}) {
  return (
    <Host style={{ width, height: 28 }}>
      <Button
        variant="text"
        label={label}
        onPress={onPress}
        modifiers={[tint(Brand.primary), foregroundStyle(Brand.primary)]}
        testID={testID}
      />
    </Host>
  );
}
