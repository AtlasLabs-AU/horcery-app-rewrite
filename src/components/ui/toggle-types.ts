export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Spoken name; the toggle draws no label of its own. */
  accessibilityLabel: string;
  /**
   * Track colour when on. Defaults to the button surface (`inverse`): a
   * switch is a control, and controls share the button colour.
   */
  tint?: string;
  testID?: string;
}

/** Native switch footprint, so rows can reserve the space without measuring. */
export const TOGGLE_WIDTH = 52;
export const TOGGLE_HEIGHT = 32;
