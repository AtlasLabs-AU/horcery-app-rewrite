import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SplitRow } from '@/components/ui/split-row';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * The raised container every For You section sits in, plus the header row
 * shared by all of them (title on the left, optional adornment beside it,
 * optional action flush right — on the SAME line, always).
 *
 * The header row is the fix for the misalignment Inakshi flagged 2026-08-15:
 * the action slot no longer accepts a self-sized native Host, so "See History"
 * sits on the title line.
 *
 * It said "at every text size", and that was wrong. Shrinking the title against
 * a fixed-width action means the title is the only thing that can give, and at
 * one notch above the default text size it gave: "Behavior Tracker" rendered as
 * "Behavior Trac…" on the largest iPhone we have (device, 2026-08-19 — the same
 * fault the shipping app is patching in PR 2174). The row now stacks instead;
 * `SplitRow` carries the reasoning.
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
    <SplitRow
      style={styles.headerRow}
      leading={
        <>
          {/*
            Two lines, not one. A card title is the name of the thing you are
            looking at; truncating it to make room for a button beside it gets
            the priority exactly backwards.
          */}
          <Text style={[type.title, styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {title}
          </Text>
          {adornment}
        </>
      }
      trailing={action}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    marginHorizontal: space.edge,
    // Editorial pass: card padding = the brief's 20, and the title up one
    // step (title, not title3). Type and air do the hierarchy, not fills.
    padding: space.card,
  },
  headerRow: {
    minHeight: 32,
  },
  title: {
    flexShrink: 1,
  },
});
