import { Host } from '@expo/ui';
import { Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

/** Native segmented controls are 32pt tall on iOS; keep the Host honest. */
const HEIGHT = 32;

/**
 * Two-or-more-option segmented control — Daily/Weekly on the Behavior Tracker,
 * Stall/Horse on the intake cards.
 *
 * Replaces the current app's hand-drawn segmented buttons with the platform's
 * own control, so it tracks system appearance, Dynamic Type and accessibility
 * without our help. The Host needs an explicit size; width comes from the
 * caller because it depends on the labels.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  width,
  testID,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  width: number;
  testID?: string;
}) {
  return (
    <Host style={{ width, height: HEIGHT }}>
      <Picker
        selection={value}
        onSelectionChange={(next) => onChange(String(next) as T)}
        modifiers={[pickerStyle('segmented'), frame({ width, height: HEIGHT })]}
        testID={testID}>
        {options.map((option) => (
          <SwiftUIText key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </SwiftUIText>
        ))}
      </Picker>
    </Host>
  );
}
