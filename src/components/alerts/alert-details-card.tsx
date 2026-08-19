import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FieldShell, NumberField } from '@/components/alerts/field-shell';
import { Menu } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Toggle } from '@/components/ui/toggle';
import { AlertCondition } from '@/config/enums/alert-conditions';
import { radius, space, type } from '@/constants/tokens';
import { formatMinutes } from '@/domain/alerts/summary';
import type { AlertRuleForm, AlertTypeDescriptor, FieldErrors, Units } from '@/domain/alerts/types';
import { matchPreset } from '@/domain/alerts/units';
import type { FormAction } from '@/hooks/alerts/use-alert-rule-form';
import { useTokens } from '@/hooks/use-tokens';

const CONDITION_LABEL: Record<AlertCondition, string> = {
  [AlertCondition.GREATER_THAN]: 'More than',
  [AlertCondition.LESS_THAN]: 'Less than',
  [AlertCondition.EQUAL_TO]: 'Equal to',
  [AlertCondition.NOT_EQUAL_TO]: 'Not',
  [AlertCondition.GREATER_THAN_OR_EQUAL_TO]: 'At least',
  [AlertCondition.LESS_THAN_OR_EQUAL_TO]: 'At most',
};

/** temp-change reads better as a direction than a comparator. */
const DIRECTION_LABEL: Partial<Record<AlertCondition, string>> = {
  [AlertCondition.GREATER_THAN]: 'Rises',
  [AlertCondition.LESS_THAN]: 'Drops',
};

const CUSTOM = '__custom__';

/**
 * The fields for one alert type, chosen by its descriptor — never by slug in
 * here. Kind picks the threshold widget; the three time concepts render only
 * when the descriptor has them; unknown types get the generic set.
 */
export function AlertDetailsCard({
  form,
  descriptor,
  units,
  errors,
  dispatch,
  disabled,
}: {
  form: AlertRuleForm;
  descriptor: AlertTypeDescriptor;
  units: Units;
  errors: FieldErrors;
  dispatch: (action: FormAction) => void;
  disabled: boolean;
}) {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const segWidth = Math.max(width - space.edge * 2 - space.card * 2, 220);
  const kind = descriptor.threshold.kind;
  const unit = descriptor.threshold.unit?.[units];
  const isTempChange = descriptor.slug === 'temp-change';

  // ---- comparator
  const conditionField =
    descriptor.conditions.length > 1 ? (
      <FieldShell label={isTempChange ? 'Direction' : 'Condition'} error={errors.condition}>
        <SegmentedControl<string>
          options={descriptor.conditions.map((c) => ({
            label: (isTempChange ? DIRECTION_LABEL[c] : undefined) ?? CONDITION_LABEL[c],
            value: c,
          }))}
          value={form.condition ?? descriptor.conditions[0]}
          onChange={(v) => !disabled && dispatch({ type: 'condition', value: v as AlertCondition })}
          width={segWidth}
          accessibilityLabel={isTempChange ? 'Direction' : 'Condition'}
          testID="field-condition"
        />
      </FieldShell>
    ) : null;

  // ---- threshold by kind
  let thresholdField: React.ReactNode = null;
  if (kind === 'degrees' || kind === 'count' || kind === 'number') {
    const presets = descriptor.threshold.presets ?? [];
    // Tolerant match: a stored 26.7 °C reads back as 80.1 °F, which IS the
    // 80 °F preset one rounding step away — see `matchPreset`.
    const matched = matchPreset(presets, form.thresholdValue);
    const onPreset = matched != null && !form.isCustom;
    const options = [
      ...presets.map((p) => ({ label: `${p.label}${unit ? ` ${unit}` : ''}`, value: String(p.value) })),
      ...(descriptor.threshold.allowCustom ? [{ label: 'Custom', value: CUSTOM }] : []),
    ];
    thresholdField = (
      <FieldShell
        label={isTempChange ? `Change (${unit})` : kind === 'count' ? 'How many times' : `Threshold${unit ? ` (${unit})` : ''}`}
        error={errors.thresholdValue}>
        {options.length > 1 ? (
          <SegmentedControl<string>
            options={options}
            value={onPreset ? String(matched) : CUSTOM}
            onChange={(v) => {
              if (disabled) return;
              if (v === CUSTOM) dispatch({ type: 'custom', value: true });
              else dispatch({ type: 'preset', value: Number(v) });
            }}
            width={segWidth}
            accessibilityLabel="Threshold"
            testID="field-threshold-presets"
          />
        ) : null}
        {(!onPreset || presets.length === 0) && descriptor.threshold.allowCustom ? (
          <NumberField
            value={form.thresholdValue}
            onChange={(n) => dispatch({ type: 'threshold', value: n })}
            unit={unit}
            integer={kind === 'count'}
            disabled={disabled}
            accessibilityLabel="Custom threshold"
            testID="field-threshold-custom"
          />
        ) : null}
      </FieldShell>
    );
  } else if (kind === 'selection') {
    const options = descriptor.threshold.options ?? [];
    thresholdField = (
      <FieldShell label="Level" error={errors.thresholdValue}>
        <SegmentedControl<string>
          options={options.map((o) => ({ label: o.label, value: String(o.value) }))}
          value={String(form.thresholdValue ?? options[0]?.value ?? '')}
          onChange={(v) => !disabled && dispatch({ type: 'preset', value: Number(v) })}
          width={segWidth}
          accessibilityLabel="Level"
          testID="field-selection"
        />
      </FieldShell>
    );
  } else if (kind === 'boolean') {
    thresholdField = (
      <FieldShell label="Alert when" error={errors.booleanValue}>
        <View style={styles.toggleRow}>
          <Text style={[type.body, { color: colors.foreground }]}>
            {form.booleanValue === false ? 'It stops' : 'It happens'}
          </Text>
          <Toggle
            value={form.booleanValue !== false}
            onValueChange={(v) => dispatch({ type: 'boolean', value: v })}
            disabled={disabled}
            accessibilityLabel="Alert when it happens"
            testID="field-boolean"
          />
        </View>
      </FieldShell>
    );
  }

  // ---- duration (threshold for duration kinds; trigger for others)
  const durationPresets =
    kind === 'duration'
      ? (descriptor.threshold.presets ?? []).map((p) => p.value)
      : (descriptor.triggerDuration?.presetsMinutes ?? []);
  const showDuration = kind === 'duration' || !!descriptor.triggerDuration;
  const durationField = showDuration ? (
    <FieldShell
      label={kind === 'duration' ? 'For how long' : 'For at least'}
      hint={kind !== 'duration' && form.durationMinutes == null ? 'Optional — alert as soon as it happens.' : undefined}
      error={errors.durationMinutes}>
      {durationPresets.length > 0 ? (
        <SegmentedControl<string>
          options={[
            ...durationPresets.map((m) => ({ label: formatMinutes(m), value: String(m) })),
            { label: 'Custom', value: CUSTOM },
          ]}
          value={
            !form.isCustomDuration && durationPresets.includes(form.durationMinutes ?? -1)
              ? String(form.durationMinutes)
              : CUSTOM
          }
          onChange={(v) => {
            if (disabled) return;
            if (v === CUSTOM) dispatch({ type: 'durationCustom', value: true });
            else {
              dispatch({ type: 'duration', value: Number(v) });
              dispatch({ type: 'durationCustom', value: false });
            }
          }}
          width={segWidth}
          accessibilityLabel="Duration"
          testID="field-duration-presets"
        />
      ) : null}
      {durationPresets.length === 0 || form.isCustomDuration || !durationPresets.includes(form.durationMinutes ?? -1) ? (
        <NumberField
          value={form.durationMinutes}
          onChange={(n) => dispatch({ type: 'duration', value: n })}
          unit="min"
          integer
          disabled={disabled}
          accessibilityLabel="Duration in minutes"
          testID="field-duration-custom"
        />
      ) : null}
    </FieldShell>
  ) : null;

  // ---- based on
  const basedOnField = descriptor.basedOn ? (
    <FieldShell
      label="Counted"
      hint={form.basedOn === 2 ? 'Adds up every stretch in the window.' : 'One continuous stretch.'}
      error={errors.basedOn}>
      <SegmentedControl<string>
        options={descriptor.basedOn.map((o) => ({ label: o.label, value: String(o.value) }))}
        value={String(form.basedOn ?? descriptor.basedOn[0].value)}
        onChange={(v) => !disabled && dispatch({ type: 'basedOn', value: Number(v) })}
        width={segWidth}
        accessibilityLabel="Counted"
        testID="field-based-on"
      />
    </FieldShell>
  ) : null;

  // ---- within any
  const rangeField = descriptor.queryRange ? (
    <FieldShell label="Within any" error={errors.queryRangeMinutes}>
      <Menu
        label={form.queryRangeMinutes ? formatMinutes(form.queryRangeMinutes) : 'Choose…'}
        accessibilityLabel="Within any"
        title="Within any"
        testID="field-query-range"
        actions={descriptor.queryRange.presetsMinutes.map((m) => ({
          id: String(m),
          label: formatMinutes(m),
          selected: form.queryRangeMinutes === m,
          disabled,
          onPress: () => dispatch({ type: 'queryRange', value: m }),
        }))}
      />
    </FieldShell>
  ) : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} testID="alert-details">
      <Text style={[type.title3, { color: colors.foreground }]}>Alert details</Text>
      {descriptor.isGeneric ? (
        <Text style={[type.footnote, { color: colors.tertiary }]}>
          This alert type is new — showing basic settings.
        </Text>
      ) : null}
      {conditionField}
      {thresholdField}
      {durationField}
      {basedOnField}
      {rangeField}
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
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
});
