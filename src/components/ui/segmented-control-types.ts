export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Native segmented controls need an explicit width on both platforms. */
  width: number;
  accessibilityLabel?: string;
  testID?: string;
}

/** iOS segmented controls are 32pt tall; Material's row matches at 40dp. */
export const SEGMENTED_HEIGHT_IOS = 32;
export const SEGMENTED_HEIGHT_ANDROID = 40;
