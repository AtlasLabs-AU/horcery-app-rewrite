import { StyleSheet, Text, View } from 'react-native';

import { Fyp, Radius, Spacing } from '@/constants/theme';

/**
 * Stands in for a chart while the charting-library decision is parked.
 *
 * Deliberately the same size and position as the real chart so the page's
 * layout and scroll length are honest — and it reproduces the current app's
 * own "No data available" state, which is what the QA organization shows
 * anyway.
 */
export function ChartPlaceholder({
  height = 148,
  message = 'No data available',
  legend,
  testID,
}: {
  height?: number;
  message?: string;
  legend?: { label: string; color: string }[];
  testID?: string;
}) {
  return (
    <View style={[styles.surface, { height }]} testID={testID}>
      <Text style={styles.message}>{message}</Text>
      {legend?.length ? (
        <View style={styles.legendRow}>
          {legend.map((entry) => (
            <View key={entry.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
              <Text style={styles.legendLabel}>{entry.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: Fyp.chartPlaceholder,
    borderRadius: Radius.inner,
    marginTop: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  message: {
    fontSize: 15,
    color: Fyp.muted,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    color: Fyp.body,
  },
});
