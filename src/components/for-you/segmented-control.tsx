import { Host } from '@expo/ui';
import { Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

/**
 * Two-or-more-option segmented control — Daily/Weekly on the Behavior Tracker,
 * Stall/Horse on the intake cards.
 *
 * Replaces the current app's `controlled-segmented-buttons`, which draws
 * gluestack Buttons and re-implements selection, press states and rounding by
 * hand. This is the platform's own segmented control, so it tracks system
 * appearance, Dynamic Type and accessibility without our help.
 *
 * The `<Host>` needs an explicit size — see horcery-rewrite-dev-loop-gotchas.
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
    <Host style={{ width, height: 32 }}>
      <Picker
        selection={value}
        onSelectionChange={(next) => onChange(String(next) as T)}
        modifiers={[pickerStyle('segmented'), frame({ width, height: 32 })]}
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
