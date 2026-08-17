import type { DateTime } from 'luxon';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { canGoBack, canGoForward, dayLabel, isToday } from '@/hooks/playhead-data';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Which day the page is showing.
 *
 * Stepping only — a full calendar picker is a native sheet and belongs with
 * the video slice, where scrubbing to an arbitrary moment is the point. Here
 * the useful moves are "yesterday" and "back to today", and both are one tap.
 *
 * Neither arrow is ever a dead control: at the ends they are visibly disabled
 * and lose their button role, so a screen reader does not announce a button
 * that will not act (requirements §6b item 3).
 */
export function HorseDateBar({
  day,
  now,
  earliest,
  onChange,
  onToday,
}: {
  day: DateTime;
  now: DateTime;
  /** The horse's creation date — nothing exists before it. */
  earliest?: DateTime;
  onChange: (next: DateTime) => void;
  /**
   * Separate from `onChange`: this re-tracks the live clock rather than
   * jumping to a fixed instant, so the bar does not freeze the moment you
   * tap "today" the way the current app's clock freezes at mount.
   */
  onToday: () => void;
}) {
  const { colors } = useTokens();
  const backEnabled = canGoBack(day, earliest);
  const forwardEnabled = canGoForward(day, now);
  const showToday = !isToday(day, now);

  return (
    <View style={[styles.bar, { backgroundColor: colors.card }]} testID="horse-date-bar">
      <Step
        direction="back"
        enabled={backEnabled}
        onPress={() => onChange(day.minus({ days: 1 }))}
      />

      <View style={styles.label}>
        <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
          {dayLabel(day, now)}
        </Text>
        {showToday ? (
          <Pressable
            onPress={onToday}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back to today"
            testID="horse-date-today">
            <Text style={[type.footnote, { color: colors.accent, fontWeight: '600' }]}>
              Back to today
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Step
        direction="forward"
        enabled={forwardEnabled}
        onPress={() => onChange(day.plus({ days: 1 }))}
      />
    </View>
  );
}

function Step({
  direction,
  enabled,
  onPress,
}: {
  direction: 'back' | 'forward';
  enabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTokens();
  const isBack = direction === 'back';
  return (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      hitSlop={8}
      accessibilityRole={enabled ? 'button' : undefined}
      accessibilityLabel={
        enabled
          ? isBack
            ? 'Previous day'
            : 'Next day'
          : isBack
            ? 'No earlier days for this horse'
            : 'Today is the latest day'
      }
      testID={`horse-date-${direction}`}
      style={({ pressed }) => [styles.step, pressed && enabled && { opacity: 0.6 }]}>
      <Icon
        name={isBack ? 'back' : 'chevronRight'}
        size={18}
        color={enabled ? colors.accent : colors.dimmed}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: space.sm,
    minHeight: 52,
  },
  step: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, alignItems: 'center', gap: space.xxs },
});
