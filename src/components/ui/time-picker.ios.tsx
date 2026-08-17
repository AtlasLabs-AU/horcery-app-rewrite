import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { View } from 'react-native';

import {
  clockToDate,
  dateToClock,
  TIME_PICKER_HEIGHT,
  type TimePickerProps,
} from '@/components/ui/time-picker-types';
import { useTokens } from '@/hooks/use-tokens';

/**
 * iOS half of the universal `TimePicker` (surface layer): the system compact
 * time control — a pill that opens the wheel on tap. Native, so it reads
 * exactly like the one in Clock or Calendar.
 */
export function TimePicker({ value, onChange, disabled, accessibilityLabel, testID }: TimePickerProps) {
  const { colors } = useTokens();
  return (
    <View
      style={{ height: TIME_PICKER_HEIGHT, justifyContent: 'center' }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}>
      <DateTimePicker
        value={clockToDate(value)}
        mode="time"
        display="compact"
        disabled={disabled}
        accentColor={colors.inverse}
        onValueChange={(_event, date) => onChange(dateToClock(date))}
      />
    </View>
  );
}
