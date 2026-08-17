import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlertDetailsCard } from '@/components/alerts/alert-details-card';
import { useAlertsPermissions } from '@/components/alerts/alerts-permissions';
import { InsightCard } from '@/components/alerts/insight-card';
import { PayloadPreview } from '@/components/alerts/payload-preview';
import { ScopeRow } from '@/components/alerts/scope-row';
import { WindowCard } from '@/components/alerts/window-card';
import { ErrorState, ListSkeleton, StateShell } from '@/components/app/page-states';
import { Icon } from '@/components/ui/icon';
import { SAMPLE_ALERT_RULES, SAMPLE_ALERT_TYPES, SAMPLE_BARN_ZONE } from '@/config/sample/alerts-sample';
import { radius, space, type } from '@/constants/tokens';
import { emptyForm, toForm } from '@/domain/alerts/payload';
import { applyTag, notifyTag } from '@/domain/alerts/scope';
import type { AlertRuleForm, AlertTypeDescriptor, ServerAlertRule, Units } from '@/domain/alerts/types';
import { detectDrift, readWindowMetadata } from '@/domain/alerts/window';
import { newRequestId, takeTargetsResult, useTargetsResultPending } from '@/hooks/alerts/targets-selection-store';
import { useAlertRule } from '@/hooks/alerts/use-alert-rule';
import { useAlertRuleForm } from '@/hooks/alerts/use-alert-rule-form';
import { useAlertTypes } from '@/hooks/alerts/use-alert-types';
import { useBarnZone } from '@/hooks/alerts/use-barn-zone';
import { useOrganizationNow } from '@/hooks/use-organization-now';
import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@acme/stores/authorization-states';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

/**
 * Configure — create (params.typeId) or edit (params.ruleId) one alert rule.
 *
 * Small on purpose: it resolves data, then hands a ready form to
 * `ConfigureForm`, which composes the cards. Every field is chosen by the
 * descriptor; every derived value is a pure domain call.
 *
 * A3: Save never calls the service. When the form is valid, Save opens the
 * dev-only payload preview (what WOULD be sent); in a non-dev build it is
 * disabled with the reason. Delete is disabled with its reason. A4 wires both.
 * Read-only roles get the same screen with every control disabled.
 */
export default function ConfigureAlertScreen() {
  const params = useLocalSearchParams<{ typeId?: string; ruleId?: string }>();
  const typeId = param(params.typeId);
  const ruleId = param(params.ruleId);
  const isSample = ruleId.startsWith('sample-');

  const { colors } = useTokens();
  const types = useAlertTypes(isSample ? SAMPLE_ALERT_TYPES : undefined);
  const ruleQuery = useAlertRule(ruleId && !isSample ? ruleId : undefined);
  const barn = useBarnZone();

  const rule: ServerAlertRule | undefined = isSample
    ? SAMPLE_ALERT_RULES.find((r) => r.id === ruleId)
    : ruleQuery.rule;
  const descriptor: AlertTypeDescriptor | undefined = rule
    ? types.byId.get(typeof rule.alert_type === 'string' ? rule.alert_type : (rule.alert_type?.id ?? ''))
    : types.byId.get(typeId);

  const zone = isSample ? SAMPLE_BARN_ZONE : barn.zone;
  const zoneFallback = isSample ? false : barn.fallback;
  const loading = types.isLoading || (!!ruleId && !isSample && ruleQuery.isLoading) || barn.isLoading;

  if (loading) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: ruleId ? 'Edit alert' : 'New alert', headerLargeTitle: false }} />
        <ListSkeleton rows={3} rowHeight={140} testID="configure-loading" />
      </View>
    );
  }
  if (types.isError || (ruleId && !isSample && ruleQuery.isError)) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Alert', headerLargeTitle: false }} />
        <ErrorState title="Couldn’t load this alert" onRetry={() => void Promise.all([types.refetch(), ruleQuery.refetch()])} />
      </View>
    );
  }
  if (!descriptor || (ruleId && !rule)) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Alert', headerLargeTitle: false }} />
        <StateShell icon="info" title={ruleId ? 'Alert not found' : 'Alert type not found'} detail="It may have been removed." testID="configure-missing" />
      </View>
    );
  }

  return (
    <ConfigureForm
      key={rule?.id ?? `new-${descriptor.id}`}
      rule={rule}
      descriptor={descriptor}
      zone={zone}
      zoneFallback={zoneFallback}
      isSample={isSample}
    />
  );
}

function ConfigureForm({
  rule,
  descriptor,
  zone,
  zoneFallback,
  isSample,
}: {
  rule: ServerAlertRule | undefined;
  descriptor: AlertTypeDescriptor;
  zone: string;
  zoneFallback: boolean;
  isSample: boolean;
}) {
  const { colors } = useTokens();
  const permissions = useAlertsPermissions();
  const organizationID = useAuthStore((s) => s.organizationID) ?? '';
  const memberId = useAuthStore((s) => s.memberId);
  const isMetric = useAuthStore((s) => s.userPreferences?.isMetric);
  const units: Units = isMetric ? 'metric' : 'imperial';
  const now = useOrganizationNow(zone);
  const editing = !!rule;
  const readOnly = editing ? !permissions.edit : !permissions.create;

  const initial = useMemo<AlertRuleForm>(
    () => (rule ? toForm(rule, descriptor, units, zone, now, zoneFallback) : emptyForm(descriptor, zone, zoneFallback)),
    // `now` intentionally excluded: the initial form is computed once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rule, descriptor, units, zone, zoneFallback],
  );

  const { form, dispatch, errors, valid, sentence, payload } = useAlertRuleForm({
    initial,
    descriptor,
    units,
    organizationId: organizationID,
    now,
    mode: editing ? 'patch' : 'create',
    existingMetadata: rule?.UNATTESTED_META_DATA ?? null,
  });

  const drift = useMemo(
    () => (rule ? detectDrift(readWindowMetadata(rule.UNATTESTED_META_DATA), zone, now) : null),
    [rule, zone, now],
  );

  // ---- targets picker hand-off
  const [applyRequest] = useState(() => newRequestId('apply'));
  const [notifyRequest] = useState(() => newRequestId('notify'));
  const applyPending = useTargetsResultPending(applyRequest);
  const notifyPending = useTargetsResultPending(notifyRequest);
  useEffect(() => {
    if (applyPending) {
      const r = takeTargetsResult(applyRequest);
      if (r) dispatch({ type: 'apply', value: r.selection });
    }
  }, [applyPending, applyRequest, dispatch]);
  useEffect(() => {
    if (notifyPending) {
      const r = takeTargetsResult(notifyRequest);
      if (r) dispatch({ type: 'notify', value: r.selection });
    }
  }, [notifyPending, notifyRequest, dispatch]);

  const openTargets = useCallback(
    (which: 'apply' | 'notify') => {
      const selection = which === 'apply' ? form.scope.apply : form.scope.notify;
      router.push({
        pathname: '/alerts/targets',
        params: {
          kind: which === 'apply' ? form.scope.target : 'members',
          requestId: which === 'apply' ? applyRequest : notifyRequest,
          mode: selection.mode,
          ids: selection.mode === 'all' ? '' : selection.ids.join(','),
        },
      });
    },
    [form.scope, applyRequest, notifyRequest],
  );

  // ---- save / delete (A3: never call the service)
  const [previewOpen, setPreviewOpen] = useState(false);
  const firstError = Object.values(errors)[0];
  const saveReason = readOnly
    ? permissions.reason
    : !valid
      ? firstError
      : __DEV__
        ? undefined
        : 'Saving is switched off in this build.';
  const canPressSave = !saveReason;
  const onSave = () => {
    if (!canPressSave) return;
    if (editing) {
      // Confirm-on-edit is a native dialog (not a custom sheet): what will change, in words.
      Alert.alert('Save changes?', sentence, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Preview', onPress: () => setPreviewOpen(true) },
      ]);
      return;
    }
    setPreviewOpen(true);
  };

  const deleteReason = !permissions.delete ? permissions.reason : 'Removing alerts is coming with the write side.';

  const applyIcon = form.scope.target === 'stalls' ? 'inStall' : 'horse';

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editing ? 'Edit alert' : descriptor.name, headerLargeTitle: false }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {readOnly ? (
          <View style={[styles.note, { backgroundColor: colors.bed }]} testID="configure-read-only">
            <Icon name="info" size={15} color={colors.accent} />
            <Text style={[type.footnote, styles.noteText, { color: colors.secondary }]}>
              Viewing only. {permissions.reason}
            </Text>
          </View>
        ) : null}
        {isSample ? (
          <View style={[styles.note, { backgroundColor: colors.fillTonal }]} testID="configure-sample">
            <Icon name="info" size={15} color={colors.accent} />
            <Text style={[type.footnote, styles.noteText, { color: colors.secondary }]}>
              Sample alert for design review — nothing here is saved.
            </Text>
          </View>
        ) : null}

        <InsightCard
          icon={descriptor.icon}
          typeName={descriptor.name}
          sentence={sentence}
          applyTag={applyTag(form.scope)}
          notifyTag={notifyTag(form.scope, memberId)}
          applyIcon={applyIcon}
        />

        <AlertDetailsCard form={form} descriptor={descriptor} units={units} errors={errors} dispatch={dispatch} disabled={readOnly} />

        <WindowCard window={form.window} error={errors.window} drift={drift} dispatch={dispatch} disabled={readOnly} />

        <View style={styles.scopeGroup}>
          <ScopeRow
            icon={applyIcon}
            title="Apply to"
            value={applyTag(form.scope)}
            onPress={() => openTargets('apply')}
            disabled={readOnly}
            error={form.scope.apply.mode === 'include' && form.scope.apply.ids.length === 0 ? errors.scope : undefined}
            testID="scope-apply"
          />
          <ScopeRow
            icon="alerts"
            title="Send alert to"
            value={notifyTag(form.scope, memberId)}
            onPress={() => openTargets('notify')}
            disabled={readOnly}
            error={form.scope.notify.mode === 'include' && form.scope.notify.ids.length === 0 ? errors.scope : undefined}
            testID="scope-notify"
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={onSave}
            disabled={!canPressSave}
            accessibilityRole={canPressSave ? 'button' : undefined}
            accessibilityLabel={editing ? 'Save changes' : 'Create alert'}
            accessibilityHint={saveReason}
            testID="configure-save"
            style={({ pressed }) => [
              styles.primary,
              { backgroundColor: canPressSave ? colors.inverse : colors.bed },
              pressed && canPressSave && { opacity: 0.85 },
            ]}>
            <Text style={[type.headline, { color: canPressSave ? colors.onInverse : colors.tertiary }]}>
              {editing ? 'Save changes' : 'Create alert'}
            </Text>
          </Pressable>
          {saveReason ? (
            <Text style={[type.footnote, styles.reason, { color: colors.tertiary }]} testID="configure-save-reason">
              {saveReason}
            </Text>
          ) : __DEV__ ? (
            <Text style={[type.footnote, styles.reason, { color: colors.tertiary }]}>
              Dev build: shows what would be sent. Nothing is saved yet.
            </Text>
          ) : null}
          {editing ? (
            <View style={styles.deleteBlock}>
              <Text style={[type.headline, { color: colors.dimmed }]} accessibilityLabel="Remove alert (unavailable)" testID="configure-delete">
                Remove alert
              </Text>
              <Text style={[type.footnote, styles.reason, { color: colors.tertiary }]}>{deleteReason}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <PayloadPreview visible={previewOpen} onClose={() => setPreviewOpen(false)} sentence={sentence} payload={payload} zone={zone} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: space.edge, paddingBottom: space.xxl, gap: space.md },
  note: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  noteText: { flex: 1 },
  scopeGroup: { gap: space.sm },
  actions: { gap: space.sm, alignItems: 'center', paddingTop: space.md },
  primary: {
    minHeight: 48,
    alignSelf: 'stretch',
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reason: { textAlign: 'center', paddingHorizontal: space.lg },
  deleteBlock: { alignItems: 'center', gap: space.xxs, paddingTop: space.md },
});
