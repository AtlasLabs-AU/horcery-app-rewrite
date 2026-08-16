import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Month header with ‹ › arrows and the horizontal day strip, matching the
 * current app's layout.
 *
 * Two behaviours corrected here:
 * - **Future days are not selectable.** The current app renders them tappable
 *   (its `clamp` prop is accepted and never read), so tapping tomorrow fires a
 *   query guaranteed to return nothing.
 * - The strip is built in the ORGANIZATION's zone, so "today" is the barn's
 *   today.
 */
export function DayStrip({
  selected,
  today,
  onSelect,
}: {
  selected: DateTime;
  /** "Now" in the organization's zone — the last selectable day. */
  today: DateTime;
  onSelect: (day: DateTime) => void;
}) {
  const { colors } = useTokens();

  // A week centred on the selection, as the current app shows.
  const days = useMemo(() => {
    const start = selected.minus({ days: 3 });
    return Array.from({ length: 7 }, (_, index) => start.plus({ days: index }));
  }, [selected]);

  const canGoForward = selected.startOf('day') < today.startOf('day');

  return (
    <View style={styles.wrapper}>
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => onSelect(selected.minus({ days: 1 }))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          testID="history-previous-day">
          <Icon name="back" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[type.headline, { color: colors.foreground }]}>
          {selected.toFormat('d LLL yyyy')}
        </Text>
        <Pressable
          onPress={canGoForward ? () => onSelect(selected.plus({ days: 1 })) : undefined}
          disabled={!canGoForward}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          accessibilityState={{ disabled: !canGoForward }}
          testID="history-next-day">
          <Icon
            name="chevronRight"
            size={18}
            color={canGoForward ? colors.foreground : colors.dimmed}
          />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}>
        {days.map((day) => {
          const isSelected = day.hasSame(selected, 'day');
          const isFuture = day.startOf('day') > today.startOf('day');
          return (
            <Pressable
              key={day.toISODate()}
              onPress={isFuture ? undefined : () => onSelect(day)}
              disabled={isFuture}
              accessibilityRole="button"
              accessibilityLabel={day.toFormat('cccc d LLLL')}
              accessibilityState={{ selected: isSelected, disabled: isFuture }}
              testID={`history-day-${day.toISODate()}`}
              style={styles.day}>
              <Text
                style={[
                  type.caption,
                  { color: isFuture ? colors.dimmed : colors.tertiary },
                ]}>
                {day.toFormat('ccc')}
              </Text>
              <View
                style={[
                  styles.dayNumber,
                  isSelected && { backgroundColor: colors.accent },
                ]}>
                <Text
                  style={[
                    type.headline,
                    {
                      color: isSelected
                        ? colors.onAccent
                        : isFuture
                          ? colors.dimmed
                          : colors.foreground,
                    },
                  ]}>
                  {day.toFormat('d')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  strip: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.edge,
  },
  day: { alignItems: 'center', gap: space.xs, minWidth: 40 },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
