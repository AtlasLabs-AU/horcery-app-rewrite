import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AlertRuleRow } from '@/components/alerts/alert-rule-row';
import { useAlertsPermissions } from '@/components/alerts/alerts-permissions';
import { AlertsPreviewBanner } from '@/components/alerts/alerts-preview-banner';
import { ErrorState, ListSkeleton, NoInternetState, StateShell } from '@/components/app/page-states';
import { Icon } from '@/components/ui/icon';
import { PREVIEWS } from '@/config/previews';
import {
  SAMPLE_ALERT_RULES,
  SAMPLE_ALERT_TYPES,
  SAMPLE_BARN_ZONE,
  SAMPLE_CURRENT_MEMBER_ID,
} from '@/config/sample/alerts-sample';
import { radius, space, type } from '@/constants/tokens';
import type { ServerAlertRule, Units } from '@/domain/alerts/types';
import { describeRule, type AlertRuleView } from '@/domain/alerts/view';
import { useAlertRules } from '@/hooks/alerts/use-alert-rules';
import { useAlertTypes } from '@/hooks/alerts/use-alert-types';
import { useBarnZone } from '@/hooks/alerts/use-barn-zone';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOrganizationNow } from '@/hooks/use-organization-now';
import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@acme/stores/authorization-states';

/**
 * Manage Alerts — the organization's alert rules, read-only in this slice.
 *
 * Two requests on a cold open (types, rules) plus the cached organization —
 * the shipping page fires a third for suggested alerts it never shows.
 * Every row is the domain's `describeRule`: sentence, tags, drift.
 * Add / edit / delete arrive in A3; here they are honestly absent, and the
 * footer says so.
 */
export default function ManageAlertsScreen() {
  const { colors } = useTokens();
  const permissions = useAlertsPermissions();
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(!isOnline);

  const isMetric = useAuthStore((s) => s.userPreferences?.isMetric);
  const memberId = useAuthStore((s) => s.memberId);
  const units: Units = isMetric ? 'metric' : 'imperial';

  const rules = useAlertRules();
  const barn = useBarnZone();
  const now = useOrganizationNow(barn.zone);

  // Sample mode is decided only from the real, unfiltered result: the
  // organization has NO rules and the preview is on. Real rules always win.
  const usingSample =
    PREVIEWS.sampleAlertsData && !!rules.organizationID && !rules.isLoading && !rules.isError && rules.rules.length === 0;

  const types = useAlertTypes(usingSample ? SAMPLE_ALERT_TYPES : undefined);

  const source: ServerAlertRule[] = usingSample ? SAMPLE_ALERT_RULES : rules.rules;
  const currentMemberId = usingSample ? SAMPLE_CURRENT_MEMBER_ID : memberId;
  // Sample rules are authored in the sample barn's zone; reading them in the
  // real organization's zone would (correctly) flag every one as drifted.
  const zone = usingSample ? SAMPLE_BARN_ZONE : barn.zone;
  const zoneFallback = usingSample ? false : barn.fallback;

  const views = useMemo<AlertRuleView[]>(
    () =>
      source
        .map((rule) =>
          describeRule(rule, {
            descriptorsById: types.byId,
            units,
            zone,
            zoneFallback,
            now,
            currentMemberId,
          }),
        )
        .filter((v): v is AlertRuleView => v !== null),
    [source, types.byId, units, zone, zoneFallback, now, currentMemberId],
  );

  const loading = !usingSample && (rules.isLoading || types.isLoading || barn.isLoading);
  const error = !usingSample && (rules.isError || types.isError);
  const offline = !usingSample && !isOnline;

  const retry = useCallback(() => {
    void Promise.all([rules.refetch(), types.refetch()]);
  }, [rules, types]);

  // Reconnect → refresh automatically (the offline state promises it).
  useEffect(() => {
    if (usingSample) {
      wasOfflineRef.current = false;
      return;
    }
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      retry();
    }
  }, [isOnline, usingSample, retry]);

  const header = (
    <View style={styles.header}>
      {usingSample ? <AlertsPreviewBanner /> : null}
      {!permissions.edit ? (
        <View style={[styles.note, { backgroundColor: colors.bed }]} testID="alerts-read-only-note">
          <Icon name="info" size={15} color={colors.accent} />
          <Text style={[type.footnote, styles.noteText, { color: colors.secondary }]}>
            You can view alerts. {permissions.reason}
          </Text>
        </View>
      ) : null}
      {zoneFallback && !loading ? (
        <View style={[styles.note, { backgroundColor: colors.bed }]} testID="alerts-zone-fallback-note">
          <Icon name="clock" size={15} color={colors.accent} />
          <Text style={[type.footnote, styles.noteText, { color: colors.secondary }]}>
            Barn timezone is not set — times below are in your phone’s timezone.
          </Text>
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {rules.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : null}
      {views.length > 0 && !permissions.edit ? (
        <Text style={[type.footnote, styles.footerText, { color: colors.tertiary }]}>
          Editors and admins can add and edit alerts here.
        </Text>
      ) : null}
    </View>
  );

  return (
    <>
      {/*
        The list is the screen's DIRECT child, and a plain FlatList: iOS only
        collapses a large title when the scroll view is the top-level view of
        the screen. Inside a wrapper View (and FlashList's own wrapper) the
        title floated over the content on scroll — seen on device, A2.
        Not headerTransparent either: the native header owns its background.
      */}
      <Stack.Screen
        options={{
          title: 'Alerts',
          headerLargeTitle: true,
          headerRight: permissions.create
            ? () => (
                <Pressable
                  onPress={() => router.push('/alerts/new')}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="New alert"
                  testID="alerts-add"
                  style={styles.headerButton}>
                  <Icon name="add" size={22} color={colors.foreground} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <FlatList
        style={[styles.page, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        data={views}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={rules.isRefreshing} onRefresh={() => void rules.refresh()} />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <AlertRuleRow
              view={item}
              onPress={() => router.push({ pathname: '/alerts/configure', params: { ruleId: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          offline && views.length === 0 ? (
            <NoInternetState onRetry={retry} enabled={isOnline} testID="alerts-offline" />
          ) : loading ? (
            <ListSkeleton rows={3} testID="alerts-loading" />
          ) : error ? (
            <ErrorState title="Couldn’t load alerts" onRetry={retry} testID="alerts-error" />
          ) : (
            <StateShell
              icon="alerts"
              title="No alerts yet"
              detail={
                permissions.create
                  ? 'Alerts tell you when something needs a look.'
                  : `Alerts tell you when something needs a look. ${permissions.reason}`
              }
              testID="alerts-empty">
              {permissions.create ? (
                <Pressable
                  onPress={() => router.push('/alerts/new')}
                  accessibilityRole="button"
                  accessibilityLabel="Add an alert"
                  testID="alerts-empty-add"
                  style={({ pressed }) => [styles.primary, { backgroundColor: colors.inverse }, pressed && { opacity: 0.85 }]}>
                  <Text style={[type.headline, { color: colors.onInverse }]}>Add an alert</Text>
                </Pressable>
              ) : null}
            </StateShell>
          )
        }
        ListFooterComponent={footer}
        onEndReached={() => {
          if (!usingSample && rules.hasNextPage && !rules.isFetchingNextPage) {
            void rules.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  listContent: { paddingBottom: space.xxl },
  header: { paddingTop: space.sm },
  note: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.edge,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  noteText: { flex: 1 },
  cell: { paddingHorizontal: space.edge, paddingBottom: space.md },
  footer: { paddingVertical: space.lg, alignItems: 'center', gap: space.sm },
  footerText: { textAlign: 'center', paddingHorizontal: space.xl },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  primary: {
    minHeight: 44,
    marginTop: space.sm,
    paddingHorizontal: space.card,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
