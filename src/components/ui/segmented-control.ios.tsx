import { Host } from '@expo/ui';
import { Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import {
  SEGMENTED_HEIGHT_IOS as HEIGHT,
  type SegmentedControlProps,
} from '@/components/ui/segmented-control-types';

/**
 * iOS half of the universal `SegmentedControl` (surface layer): SwiftUI
 * `Picker` with `pickerStyle('segmented')`, so it tracks system appearance,
 * Dynamic Type and accessibility with no help from us.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  width,
  testID,
}: SegmentedControlProps<T>) {
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
