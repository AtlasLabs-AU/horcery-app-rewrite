import { Host } from '@expo/ui';
import { Button, Menu } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  rotationEffect,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { Brand } from '@/constants/theme';

export interface OverflowAction {
  label: string;
  /** SF Symbol shown beside the item. */
  systemImage?: string;
  onPress?: () => void;
  destructive?: boolean;
}

/**
 * The "⋮" overflow menus on the Snapshots and Behavior Tracker cards.
 *
 * The current app opens a custom `react-native-actions-sheet` bottom sheet for
 * these. This is the platform's own dropdown menu: it appears anchored to the
 * button, dismisses by system rules, and needs no sheet library.
 */
export function OverflowMenu({
  actions,
  label,
  testID,
}: {
  actions: OverflowAction[];
  /** Spoken name for the button, e.g. "Snapshot options". */
  label: string;
  testID?: string;
}) {
  return (
    <Host style={{ width: 32, height: 32 }} testID={testID}>
      <Menu
        label=""
        systemImage="ellipsis"
        modifiers={[
          tint(Brand.primary),
          // SF Symbols has no plain vertical ellipsis, so rotate the horizontal
          // one to match the current app's vertical ⋮ affordance.
          rotationEffect(90),
          accessibilityLabel(label),
        ]}>
        {actions.map((action) => (
          <Button
            key={action.label}
            label={action.label}
            systemImage={action.systemImage as never}
            role={action.destructive ? 'destructive' : 'default'}
            onPress={action.onPress}
          />
        ))}
      </Menu>
    </Host>
  );
}
