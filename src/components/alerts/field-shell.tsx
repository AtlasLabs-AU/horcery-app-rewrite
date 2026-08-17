import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/** Label above, control below, one error line under — every field on Configure. */
export function FieldShell({
  label,
  hint,
  error,
  children,
  testID,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.field} testID={testID}>
      <Text style={[type.footnote, styles.label, { color: colors.secondary }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[type.caption, { color: colors.statusAlert }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[type.caption, { color: colors.tertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** A numeric entry with a unit suffix, tokens only. */
export function NumberField({
  value,
  onChange,
  unit,
  disabled,
  accessibilityLabel,
  testID,
  integer,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  unit?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
  integer?: boolean;
}) {
  const { colors } = useTokens();
  return (
    <View style={[styles.number, { backgroundColor: colors.bed }, disabled && { opacity: 0.5 }]}>
      <TextInput
        value={value == null ? '' : String(value)}
        onChangeText={(text) => {
          const cleaned = text.replace(',', '.').trim();
          if (cleaned === '' || cleaned === '-' || cleaned === '.') {
            onChange(null);
            return;
          }
          const n = Number(cleaned);
          if (Number.isFinite(n)) onChange(integer ? Math.round(n) : n);
        }}
        editable={!disabled}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        style={[type.body, styles.numberInput, { color: colors.foreground }]}
      />
      {unit ? <Text style={[type.subhead, { color: colors.secondary }]}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { textTransform: 'uppercase', letterSpacing: 0.6 },
  number: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  numberInput: { flex: 1, minWidth: 60, paddingVertical: space.sm },
});
