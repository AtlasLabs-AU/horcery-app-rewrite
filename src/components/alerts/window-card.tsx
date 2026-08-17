import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FieldShell } from '@/components/alerts/field-shell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TimePicker } from '@/components/ui/time-picker';
import { radius, space, type } from '@/constants/tokens';
import type { AlertWindow, Drift } from '@/domain/alerts/types';
import { driftLabel } from '@/domain/alerts/view';
import type { FormAction } from '@/hooks/alerts/use-alert-rule-form';
import { useTokens } from '@/hooks/use-tokens';

type Mode = AlertWindow['mode'];

/**
 * When the alert is active — "Any time" or a custom window, in BARN time.
 * Two native time pickers (D3). The zone is stated on the card so nobody
 * assumes it is their phone's; a fallback zone says so louder.
 * A drift banner appears when the stored window has moved (architecture §7.3);
 * "Re-save to fix" is wired in A4.
 */
export function WindowCard({
  window,
  error,
  drift,
  dispatch,
  disabled,
}: {
  window: AlertWindow;
  error?: string;
  drift: Drift | null;
  dispatch: (action: FormAction) => void;
  disabled: boolean;
}) {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const segWidth = Math.max(width - space.edge * 2 - space.card * 2, 220);
  const start = window.start ?? { hour: 6, minute: 0 };
  const end = window.end ?? { hour: 18, minute: 0 };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} testID="alert-window">
      <Text style={[type.title3, { color: colors.foreground }]}>When</Text>
      {drift ? (
        <View style={[styles.drift, { borderColor: colors.statusAlert }]} testID="alert-window-drift">
          <Text style={[type.footnote, { color: colors.statusAlert }]}>
            {driftLabel(drift)}
            {drift.kind === 'zone' ? ` (${drift.from} → ${drift.to})` : ''}. Re-saving fixes it — coming with writes.
          </Text>
        </View>
      ) : null}
      <FieldShell label="Active" error={error}>
        <SegmentedControl<Mode>
          options={[
            { label: 'Any time', value: 'any' },
            { label: 'Custom', value: 'custom' },
          ]}
          value={window.mode}
          onChange={(v) => !disabled && dispatch({ type: 'windowMode', value: v })}
          width={segWidth}
          accessibilityLabel="When the alert is active"
          testID="field-window-mode"
        />
      </FieldShell>
      {window.mode === 'custom' ? (
        <View style={styles.times}>
          <FieldShell label="From">
            <TimePicker
              value={start}
              onChange={(t) => dispatch({ type: 'windowStart', value: t })}
              disabled={disabled}
              accessibilityLabel="Start time"
              testID="field-window-start"
            />
          </FieldShell>
          <FieldShell label="To">
            <TimePicker
              value={end}
              onChange={(t) => dispatch({ type: 'windowEnd', value: t })}
              disabled={disabled}
              accessibilityLabel="End time"
              testID="field-window-end"
            />
          </FieldShell>
        </View>
      ) : null}
      <Text style={[type.caption, { color: window.zoneFallback ? colors.statusAlert : colors.tertiary }]} testID="alert-window-zone">
        {window.zoneFallback
          ? `Barn timezone is not set — using your phone’s (${window.zone}).`
          : `Times are in barn time (${window.zone}).`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    gap: space.md,
  },
  times: { flexDirection: 'row', gap: space.lg },
  drift: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: space.sm,
  },
});
