import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PassportField } from '@/hooks/horse-detail-data';
import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * The horse's own facts, in one card.
 *
 * **The settings page folded in here** (Inakshi, 2026-08-17, decision D1). The
 * current app puts Assigned Stall, Group and Device ID behind a cog in the
 * header, on a page of their own — four read-only rows costing a navigation
 * hop. They are facts about the horse, so they live with the other facts, and
 * the cog is gone.
 *
 * Every row always renders. A fact we do not have says so in words ("Not
 * recorded", "No stall assigned") rather than leaving a blank: a missing value
 * and an empty value look identical otherwise, and only one of them is true.
 */
export function HorsePassport({ fields }: { fields: PassportField[] }) {
  const { colors } = useTokens();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card }]}
      testID="horse-passport">
      <Text style={[type.title3, styles.heading, { color: colors.foreground }]}>About</Text>

      <View style={styles.rows}>
        {fields.map((field, index) => (
          <Fragment key={field.id}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            ) : null}
            <View style={styles.row} testID={`horse-passport-${field.id}`}>
              <Text style={[type.subhead, styles.label, { color: colors.secondary }]}>
                {field.label}
              </Text>
              <Text
                style={[type.subhead, styles.value, { color: colors.foreground }]}
                // Two lines: a horse can be in several groups, and truncating
                // the list to one line would hide membership silently.
                numberOfLines={2}>
                {field.value}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.card,
    gap: space.md,
  },
  heading: { marginBottom: space.xxs },
  rows: { gap: space.md },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  label: { flex: 1 },
  value: { flex: 1, textAlign: 'right', fontFamily: font.medium },
});
