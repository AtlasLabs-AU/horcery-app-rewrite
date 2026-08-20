import { StyleSheet, Text, View } from 'react-native';

import { SplitRow } from '@/components/ui/split-row';
import { useTokens } from '@/hooks/use-tokens';

import type { BadgeTone } from './lying-down-badge';
import { badgeInkFor, badgeStyleFor } from './lying-down-badge';

const FIGURE_COLUMN = 78;

/** Shared alignment and badge treatment for the daily and weekly rows. */
export function LyingDownRowShell({
  horseName,
  badgeLabel,
  badgeTone,
  figure,
  subline,
  width,
  children,
}: {
  horseName: string;
  badgeLabel: string;
  badgeTone: BadgeTone;
  figure: string;
  subline?: string;
  width: number;
  children: React.ReactNode;
}) {
  const { colors, type, space } = useTokens();

  return (
    <View style={{ width, paddingVertical: space.edge }}>
      <SplitRow
        testID="lying-down-row-header"
        leading={
          <Text style={[type.subhead, styles.name, { color: colors.secondary }]} numberOfLines={2}>
            {horseName}
          </Text>
        }
        trailing={
          <View style={[styles.summary, { gap: space.sm }]}>
            <View
              style={[
                styles.badge,
                badgeStyleFor(badgeTone, colors),
                { paddingHorizontal: space.sm },
              ]}>
              <Text
                style={[type.caption, styles.badgeText, { color: badgeInkFor(badgeTone, colors) }]}
                numberOfLines={1}>
                {badgeLabel}
              </Text>
            </View>
            <Text style={[type.title3, styles.figure, { color: colors.foreground }]}>
              {figure}
            </Text>
          </View>
        }
      />

      {subline ? (
        <Text style={[type.caption, styles.subline, { color: colors.tertiary }]}>{subline}</Text>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  name: { flexShrink: 1 },
  summary: { flexDirection: 'row', alignItems: 'baseline' },
  badge: { paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontWeight: '600' },
  figure: { minWidth: FIGURE_COLUMN, flexShrink: 0, textAlign: 'right' },
  subline: { textAlign: 'right' },
});
