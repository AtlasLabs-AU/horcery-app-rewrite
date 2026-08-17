import type { IconName } from '@/components/ui/icon-names';

export interface MenuAction {
  /** Stable key, also used as the accessibility id. */
  id: string;
  label: string;
  /**
   * Second line, as in the current app's option sheets ("Update details of
   * the selected horse"). Optional — a filter row rarely needs one.
   */
  description?: string;
  icon?: IconName;
  /** Draws a checkmark. */
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}

export interface MenuProps {
  /** Rows in the sheet. An empty list renders a disabled trigger. */
  actions: MenuAction[];
  /** Text trigger — e.g. "Behavior". Mutually exclusive with `icon`. */
  label?: string;
  /** Icon trigger — e.g. the ⋮ overflow button. */
  icon?: IconName;
  /** Spoken name for the trigger; required when only an icon is shown. */
  accessibilityLabel: string;
  /** Title shown at the top of the sheet. Defaults to `accessibilityLabel`. */
  title?: string;
  /**
   * Keep the sheet open as rows are toggled, and show Done — for a filter
   * where picking three things should not mean opening it three times.
   * Single-shot actions (Edit, Remove) leave this false and close on tap.
   */
  multiSelect?: boolean;
  /** Trigger box. Kept for callers that reserve space in a flex row. */
  width?: number;
  height?: number;
  testID?: string;
}
