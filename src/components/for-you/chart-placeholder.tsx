import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Stands in for a chart while the charting-library decision is parked.
 * Same size and position as the real chart so the page's layout is honest;
 * reproduces the current app's own "No data available" state.
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
  const { colors } = useTokens();
  return (
    <View style={[styles.surface, { height, backgroundColor: colors.background }]} testID={testID}>
      <Text style={[type.subhead, { color: colors.tertiary }]}>{message}</Text>
      {legend?.length ? (
        <View style={styles.legendRow}>
          {legend.map((entry) => (
            <View key={entry.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
              <Text style={[type.footnote, { color: colors.secondary }]}>{entry.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    marginTop: space.edge,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.edge,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
});
