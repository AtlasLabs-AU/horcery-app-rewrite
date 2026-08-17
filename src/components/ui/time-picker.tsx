import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { TIME_PICKER_HEIGHT, type TimePickerProps } from '@/components/ui/time-picker-types';
import { radius, space, type } from '@/constants/tokens';
import { parseClock } from '@/domain/alerts/window';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Universal fallback for `TimePicker` (web, and jest): a plain HH:MM field.
 * The native halves live in `time-picker.ios.tsx` / `.android.tsx`.
 * Web is UNVERIFIED (architecture §14 #9).
 */
export function TimePicker({ value, onChange, disabled, accessibilityLabel, testID }: TimePickerProps) {
  const { colors } = useTokens();
  const [text, setText] = useState(`${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`);
  return (
    <TextInput
      value={text}
      editable={!disabled}
      onChangeText={(next) => {
        setText(next);
        const parsed = parseClock(next);
        if (parsed) onChange(parsed);
      }}
      placeholder="HH:MM"
      placeholderTextColor={colors.dimmed}
      keyboardType="numbers-and-punctuation"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.input,
        type.subhead,
        { color: colors.foreground, backgroundColor: colors.bed },
        disabled && { opacity: 0.5 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: TIME_PICKER_HEIGHT,
    minWidth: 96,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
});
