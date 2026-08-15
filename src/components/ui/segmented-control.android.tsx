import { Host } from '@expo/ui';
import {
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text as ComposeText,
} from '@expo/ui/jetpack-compose';

import {
  SEGMENTED_HEIGHT_ANDROID as HEIGHT,
  type SegmentedControlProps,
} from '@/components/ui/segmented-control-types';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Android half of the universal `SegmentedControl` (surface layer): Material 3
 * `SingleChoiceSegmentedButtonRow`. Deliberately Material, not a copy of the
 * iOS control — "a designed identity, not a fallback" (requirements §4).
 *
 * Colours come from the token palette so the tonal-indigo accent family is the
 * same one iOS tints with.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  width,
  testID,
}: SegmentedControlProps<T>) {
  const { colors } = useTokens();

  return (
    <Host style={{ width, height: HEIGHT }} testID={testID}>
      <SingleChoiceSegmentedButtonRow>
        {options.map((option) => (
          <SegmentedButton
            key={option.value}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
            colors={{
              activeContainerColor: colors.fillTonal,
              activeContentColor: colors.accent,
              activeBorderColor: colors.divider,
              inactiveContainerColor: colors.card,
              inactiveContentColor: colors.secondary,
              inactiveBorderColor: colors.divider,
            }}>
            <SegmentedButton.Label>
              <ComposeText>{option.label}</ComposeText>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
