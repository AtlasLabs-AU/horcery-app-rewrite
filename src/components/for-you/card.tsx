import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * The raised container every For You section sits in, plus the header row
 * shared by all of them (title on the left, optional adornment beside it,
 * optional action flush right — on the SAME line, always).
 *
 * The header row is the fix for the misalignment Inakshi flagged 2026-08-15:
 * the action slot no longer accepts a self-sized native Host; the title group
 * shrinks and the action keeps its intrinsic width, so "See History" sits on
 * the title line at every text size.
 */
export function SectionCard({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} testID={testID}>
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
  /** Rendered flush right — "See History", a ⋮ menu, a segmented control. */
  action?: ReactNode;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.headerRow}>
      <View style={styles.titleGroup}>
        <Text style={[type.title3, styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {adornment}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    marginHorizontal: space.edge,
    padding: space.edge,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: 32,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  title: {
    flexShrink: 1,
  },
  action: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
