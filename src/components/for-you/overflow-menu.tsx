import { Host } from '@expo/ui';
import { Button, Menu } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  rotationEffect,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

export interface OverflowAction {
  label: string;
  /** SF Symbol shown beside the item. */
  systemImage?: string;
  onPress?: () => void;
  destructive?: boolean;
}

/** Native menus need a fixed Host box; 32pt centres on a 32pt header row. */
const BOX = 32;

/**
 * The "⋮" overflow menus on the Snapshots and Behavior Tracker cards.
 *
 * The current app opens a custom bottom sheet for these. This is the
 * platform's own dropdown menu — anchored to the button, dismissed by system
 * rules, no sheet library. A native control that earns its Host (unlike the
 * text links, which are Pressables — see link-button.tsx).
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
  const { colors } = useTokens();
  return (
    <Host style={styles.host} testID={testID}>
      <Menu
        label=""
        systemImage="ellipsis"
        modifiers={[
          tint(colors.accent),
          // SF Symbols has no plain vertical ellipsis; rotate the horizontal
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

const styles = StyleSheet.create({
  host: {
    width: BOX,
    height: BOX,
  },
});
