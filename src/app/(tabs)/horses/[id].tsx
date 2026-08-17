import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import { HorseDateBar } from '@/components/horses/horse-date-bar';
import { BuiltInSettingsNote, HorseDetailNotice } from '@/components/horses/horse-detail-notice';
import { HorsePassport } from '@/components/horses/horse-passport';
import { HorseStallCard } from '@/components/horses/horse-stall-card';
import { HorseStatusStrip } from '@/components/horses/horse-status-strip';
import { HorsesError, HorsesLoading, HorsesNoInternet } from '@/components/horses/horses-states';
import { MediaTile } from '@/components/media/media-tile';
import { EventCard, type HistoryEvent } from '@/components/review-history/event-card';
import { toHistoryEvents } from '@/components/review-history/event-rows';
import { Icon } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { SegmentedOption } from '@/components/ui/segmented-control-types';
import { PREVIEWS } from '@/config/previews';
import {
  sampleAlertsFor,
  sampleEventsFor,
  samplePassportFor,
} from '@/config/sample/horse-detail-sample';
import { radius, space, type } from '@/constants/tokens';
import { deriveOverlay } from '@/hooks/horse-status-data';
import { dayLabel, isToday } from '@/hooks/playhead-data';
import { useHorseDetail } from '@/hooks/use-horse-detail';
import { useHorseStatus } from '@/hooks/use-horse-status';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useOrganizationNow } from '@/hooks/use-organization-now';
import { useOrganizationTimezone } from '@/hooks/use-organization-timezone';
import { usePlayhead } from '@/hooks/use-playhead';
import { useReviewHistory } from '@/hooks/use-review-history';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Horse Details — slices 1 and 2 (`docs/scope/Horcery_Horse_Details_Scope.md`).
 *
 * **Slice 1, "the honest page":** the horse's frame, its name and stall,
 * everything the API already knows about it, and its recent events and
 * alerts. Every write action is present and dimmed with a reason, so the
 * composition can be judged and nothing pretends to work.
 *
 * **Slice 2, "the living page":** the date bar, the live In/Out-of-Stall
 * status, and the temperature/noise/activeness readings — all read at the
 * play-head instant, which follows the barn's own clock rather than freezing
 * at whenever the page happened to mount (the bug parity gap C7 exists to
 * design out).
 *
 * **Still not here:** charts and the video player (slices 3–4), each gated on
 * a decision not yet taken — the chart renderer (§6a) and where chart
 * configuration lives (§6a-i). Slice 2 ships ahead of that decision on the
 * queries baked into the repo, and says so on screen (`BuiltInSettingsNote`,
 * decision D7) rather than quietly answering with whatever those turn out to
 * be.
 *
 * Decisions implemented, all 2026-08-17: D1 no settings cog (folded into the
 * passport and the header ⋮), D4 no feedback card, D5 text-only tabs, D7 the
 * built-in-settings note, D8 no Special Instructions.
 *
 * Request budget on a cold open of Summary: the animal (1), the organization
 * for its timezone (1, usually cached by For You), the group list (1, usually
 * cached by the Horses list), and — only for a horse with a monitor — the
 * in-stall and sensor queries (2). The current app's Summary tab costs ~30
 * (scope §1.7).
 */

type DetailTab = 'summary' | 'events' | 'alerts';

const TABS: SegmentedOption<DetailTab>[] = [
  { label: 'Summary', value: 'summary' },
  { label: 'Events', value: 'events' },
  { label: 'Alerts', value: 'alerts' },
];

/**
 * The window the current app's per-horse feed uses (`animal-details/feeds`
 * asks for the last 10 days). Slice 2 replaces the fixed "ending today" with
 * the date bar; until then the page says which window it is showing rather
 * than leaving you to guess.
 */
const EVENT_WINDOW_DAYS = 10;

const ALERT_EVENT_TYPES = [EVENT_TYPE_ID.alert];

const TAB_WIDTH_INSET = space.edge * 2;

function firstParam(param: string | string[] | undefined): string {
  return (Array.isArray(param) ? param[0] : param) ?? '';
}

export default function HorseDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = firstParam(params.id);
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const isOnline = useOnlineStatus();
  const timezone = useOrganizationTimezone();
  const now = useOrganizationNow(timezone);
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');

  const isSample = PREVIEWS.sampleHorsesData && id.startsWith('sample-');
  const horse = useHorseDetail(id);
  const playhead = usePlayhead(now, horse.createdAt);

  // Sample horses have no Prometheus data to honestly show — the Summary
  // tab stays exactly as slice 1 left it for them, rather than pretending a
  // fictional horse has live readings.
  const overlay = isSample
    ? 'none'
    : deriveOverlay({ stall: horse.stall, hasResolvedStall: horse.hasResolvedStall, now });
  const status = useHorseStatus({
    stall: horse.stall,
    cursor: playhead.cursor,
    enabled: !isSample && overlay === 'none',
  });

  const events = useReviewHistory({
    day: now,
    animalId: id,
    windowDays: EVENT_WINDOW_DAYS,
    enabled: !isSample && activeTab === 'events',
  });
  const alerts = useReviewHistory({
    day: now,
    animalId: id,
    eventTypes: ALERT_EVENT_TYPES,
    windowDays: EVENT_WINDOW_DAYS,
    enabled: !isSample && activeTab === 'alerts',
  });

  const eventRows = useMemo<HistoryEvent[]>(
    // The horse's name is the page title; repeating it on every frame is noise.
    () => toHistoryEvents(events.events, { timezone, omitAnimalName: true }),
    [events.events, timezone],
  );
  const alertRows = useMemo<HistoryEvent[]>(
    () => toHistoryEvents(alerts.events, { timezone, omitAnimalName: true }),
    [alerts.events, timezone],
  );

  const passport = useMemo(
    () => (isSample ? samplePassportFor(id) : horse.passport),
    [isSample, id, horse.passport],
  );

  const listData = useMemo<HistoryEvent[]>(() => {
    if (activeTab === 'summary') return [];
    if (isSample) {
      return activeTab === 'events' ? sampleEventsFor(id, now) : sampleAlertsFor(id, now);
    }
    return activeTab === 'events' ? eventRows : alertRows;
  }, [activeTab, isSample, id, now, eventRows, alertRows]);

  const active = activeTab === 'alerts' ? alerts : events;
  const tabLoading = activeTab !== 'summary' && !isSample && active.isLoading;
  const tabError = activeTab !== 'summary' && !isSample && active.isError;

  const name = horse.row?.name ?? 'Horse';

  const onRefresh = useCallback(() => {
    void horse.refresh();
    if (activeTab === 'summary') status.refetch();
    if (activeTab === 'events') void events.refetch();
    if (activeTab === 'alerts') void alerts.refetch();
  }, [horse, activeTab, status, events, alerts]);

  const onEndReached = useCallback(() => {
    if (activeTab === 'summary' || isSample) return;
    if (active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
  }, [activeTab, isSample, active]);

  const headerRight = useCallback(() => <HorseOverflowMenu name={name} />, [name]);

  const screen = (
    <Stack.Screen options={{ title: name, headerLargeTitle: false, headerRight }} />
  );

  // Offline with nothing cached: say so, rather than showing an error that
  // blames the server for the phone's signal.
  if (!isOnline && !horse.row) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        {screen}
        <HorsesNoInternet onRetry={horse.retry} enabled={isOnline} />
      </View>
    );
  }

  if (horse.isLoading) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        {screen}
        <HorsesLoading />
      </View>
    );
  }

  if (horse.isError && !horse.row) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        {screen}
        <HorsesError onRetry={horse.retry} />
      </View>
    );
  }

  if (!horse.row && !isSample) {
    return (
      <View style={[styles.centred, { backgroundColor: colors.background }]}>
        {screen}
        <Text style={[type.title3, { color: colors.foreground }]}>Horse not found</Text>
        <Text style={[type.subhead, styles.centredText, { color: colors.secondary }]}>
          It may have been removed from this organisation.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      {screen}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <EventCard event={item} />}
        ItemSeparatorComponent={ListGap}
        refreshControl={
          <RefreshControl
            refreshing={horse.isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.header}>
            <MediaTile
              posterUri={horse.row?.imageUri}
              blurhash={horse.row?.blurhash}
              tag={horse.row && !horse.row.hasCamera ? { label: 'No camera' } : undefined}
              accessibilityLabel={`${name} camera frame`}
              style={styles.hero}
            />

            <View style={styles.titleBlock}>
              <Text style={[type.largeTitle, { color: colors.foreground }]}>{name}</Text>
              <Text style={[type.headline, { color: colors.secondary }]}>
                {horse.row?.stallName ?? 'No stall'}
              </Text>
            </View>

            <SegmentedControl<DetailTab>
              options={TABS}
              value={activeTab}
              onChange={setActiveTab}
              width={Math.max(width - TAB_WIDTH_INSET, 260)}
              accessibilityLabel="Horse sections"
              testID="horse-detail-tabs"
            />

            {activeTab === 'summary' ? (
              <View style={styles.summary}>
                {!isSample ? (
                  <>
                    <HorseDateBar
                      day={playhead.day}
                      now={now}
                      earliest={horse.createdAt}
                      onChange={playhead.setDay}
                      onToday={playhead.resetToToday}
                    />
                    {overlay !== 'none' ? (
                      <HorseDetailNotice overlay={overlay} />
                    ) : (
                      <>
                        <HorseStatusStrip
                          status={status.status}
                          readings={status.readings}
                          atLabel={
                            isToday(playhead.day, now)
                              ? 'Live'
                              : `${dayLabel(playhead.day, now)}, end of day`
                          }
                        />
                        {status.hasCamera ? <BuiltInSettingsNote /> : null}
                      </>
                    )}
                  </>
                ) : null}
                <HorseStallCard stallName={horse.row?.stallName} />
                <HorsePassport fields={passport} />
              </View>
            ) : (
              <View style={styles.tabIntro}>
                <Text style={[type.footnote, { color: colors.tertiary }]}>
                  {`Last ${EVENT_WINDOW_DAYS} days`}
                </Text>
                {activeTab === 'alerts' ? <ManageAlertsRow /> : null}
                {isSample ? <SampleNote /> : null}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          activeTab === 'summary' ? null : tabLoading ? (
            <View style={styles.centre} testID="horse-tab-loading">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : tabError ? (
            <HorsesError onRetry={() => void active.refetch()} />
          ) : (
            <EmptyTab tab={activeTab} />
          )
        }
        ListFooterComponent={
          active.isFetchingNextPage && activeTab !== 'summary' ? (
            <ActivityIndicator color={colors.accent} style={styles.footer} />
          ) : null
        }
      />
    </View>
  );
}

const ListGap = () => <View style={styles.gap} />;

/**
 * The header ⋮ — the same three actions as the list card, so a horse offers
 * one menu wherever you meet it. All dimmed: the rewrite is read-only against
 * production, and each row says what it will do rather than only that it is
 * unavailable.
 *
 * This replaces the current app's settings cog (D1): with Details folded into
 * the passport and Export deferred, Delete was the only thing left behind it.
 */
function HorseOverflowMenu({ name }: { name: string }) {
  return (
    <Menu
      icon="overflow"
      accessibilityLabel={`Options for ${name}`}
      testID="horse-detail-menu"
      width={44}
      height={44}
      title={name}
      actions={[
        {
          id: 'edit',
          label: 'Edit',
          description: 'Coming soon — update this horse’s details.',
          icon: 'edit',
          disabled: true,
        },
        {
          id: 'groups',
          label: 'Manage Groups',
          description: 'Coming soon — choose which groups this horse is in.',
          icon: 'group',
          disabled: true,
        },
        {
          id: 'remove',
          label: 'Remove',
          description: 'Coming soon — remove this horse from your organisation.',
          icon: 'remove',
          destructive: true,
          disabled: true,
        },
      ]}
    />
  );
}

/** Present and dimmed: it is an edit, and it is organisation-gated. */
function ManageAlertsRow() {
  const { colors } = useTokens();
  return (
    <View
      style={[styles.manageRow, { backgroundColor: colors.bed }]}
      testID="horse-manage-alerts">
      <Icon name="settings" size={18} color={colors.tertiary} />
      <View style={styles.manageText}>
        <Text style={[type.subhead, { color: colors.secondary }]}>Manage alerts</Text>
        <Text style={[type.footnote, { color: colors.tertiary }]}>
          Coming soon — changing alert rules comes with the write side.
        </Text>
      </View>
    </View>
  );
}

function SampleNote() {
  const { colors } = useTokens();
  return (
    <View style={[styles.sampleNote, { backgroundColor: colors.fillTonal }]}>
      <Icon name="info" size={14} color={colors.accent} />
      <Text style={[type.footnote, styles.sampleText, { color: colors.secondary }]}>
        Sample events — this is a preview horse.
      </Text>
    </View>
  );
}

function EmptyTab({ tab }: { tab: DetailTab }) {
  const { colors } = useTokens();
  const isAlerts = tab === 'alerts';
  return (
    <View style={[styles.state, { backgroundColor: colors.bed }]} testID={`horse-${tab}-empty`}>
      <Icon name={isAlerts ? 'alerts' : 'info'} size={20} color={colors.accent} />
      <Text style={[type.subhead, styles.stateText, { color: colors.secondary }]}>
        {isAlerts
          ? `No alerts for this horse in the last ${EVENT_WINDOW_DAYS} days.`
          : `Nothing recorded for this horse in the last ${EVENT_WINDOW_DAYS} days.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  listContent: { padding: space.edge, paddingBottom: space.xxl },
  header: { gap: space.md, paddingBottom: space.md },
  hero: { borderRadius: radius.lg, borderCurve: 'continuous' },
  titleBlock: { gap: space.xxs },
  summary: { gap: space.md, paddingTop: space.xs },
  tabIntro: { gap: space.sm, paddingTop: space.xs },
  gap: { height: space.md },
  footer: { paddingVertical: space.lg },
  centre: { paddingVertical: space.xxl, alignItems: 'center' },
  stateShell: { flex: 1, justifyContent: 'center' },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.edge, gap: space.xs },
  centredText: { textAlign: 'center' },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    opacity: 0.85,
  },
  manageText: { flex: 1, gap: space.xxs },
  sampleNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  sampleText: { flex: 1 },
  state: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  stateText: { textAlign: 'center' },
});
