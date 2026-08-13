import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fyp, Radius, Spacing } from '@/constants/theme';

/**
 * The white rounded container every For You section sits in, plus the header
 * row shared by all of them (title on the left, optional adornment beside it,
 * optional action on the right).
 *
 * Matching the current app: 12pt radius, 16pt horizontal page margin,
 * 16pt internal padding.
 */
export function SectionCard({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.card} testID={testID}>
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  adornment,
  action,
}: {
  title: string;
  /** Rendered immediately after the title — the "10x" chip, a filter icon. */
  adornment?: ReactNode;
  /** Rendered flush right — "See History", a ⋮ menu. */
  action?: ReactNode;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        {adornment}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Fyp.card,
    borderRadius: Radius.card,
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: Fyp.title,
  },
});
