import type { IconName } from '@/components/ui/icon-names';

export interface MenuAction {
  /** Stable key, also used as the accessibility id. */
  id: string;
  label: string;
  icon?: IconName;
  /** Shows a checkmark (iOS) / trailing check (Android). */
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export interface MenuProps {
  /** Actions in the dropdown. An empty list renders a disabled trigger. */
  actions: MenuAction[];
  /** Text trigger — e.g. "Switch". Mutually exclusive with `icon`. */
  label?: string;
  /** Icon trigger — e.g. the ⋮ overflow button. */
  icon?: IconName;
  /** Spoken name for the trigger; required when only an icon is shown. */
  accessibilityLabel: string;
  /** Trigger box. Native menus need an explicit size on both platforms. */
  width?: number;
  height?: number;
  testID?: string;
}
