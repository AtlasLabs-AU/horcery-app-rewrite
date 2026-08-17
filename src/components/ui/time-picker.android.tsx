import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  clockToDate,
  dateToClock,
  formatClock,
  TIME_PICKER_HEIGHT,
  type TimePickerProps,
} from '@/components/ui/time-picker-types';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Android half of the universal `TimePicker` (surface layer). Material's
 * time picker is a DIALOG, so the control is a pill showing the value that
 * mounts the picker on tap and unmounts it on select/dismiss.
 */
export function TimePicker({ value, onChange, disabled, accessibilityLabel, testID }: TimePickerProps) {
  const { colors } = useTokens();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${formatClock(value)}`}
        testID={testID}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: colors.bed },
          pressed && { opacity: 0.85 },
          disabled && { opacity: 0.5 },
        ]}>
        <Text style={[type.subhead, { color: colors.foreground }]}>{formatClock(value)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={clockToDate(value)}
          mode="time"
          accentColor={colors.inverse}
          onValueChange={(_event, date) => {
            setOpen(false);
            onChange(dateToClock(date));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: TIME_PICKER_HEIGHT,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
