import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { Last24HoursCard } from '@/components/charts/last-24-hours-card';
import { buildLast24Hours } from '@/charts/last-24-hours';
import { ordinaryDay as last24OrdinaryDay } from '@/charts/fixtures/last-24-hours';
import { HorseTrendsCard } from '@/components/charts/horse-trends-card';
import { LyingDownTimeline } from '@/components/charts/lying-down-timeline';
import { buildLyingDownTimeline } from '@/charts/lying-down-timeline';
import { previewWeek as lyingDownPreviewWeek } from '@/charts/fixtures/lying-down-timeline';
import { buildActivenessDay, buildRollingWeek } from '@/charts/horse-trends';
import {
  activenessWithGap,
  observedDaysWithOutage,
  rollingPreviousWeek,
  rollingWeek as rollingWeekFixture,
} from '@/charts/fixtures/horse-trends';
import { HorseStallCard } from '@/components/horses/horse-stall-card';
import { HorseStatusStrip } from '@/components/horses/horse-status-strip';
import { HorsesError, HorsesLoading, HorsesNoInternet } from '@/components/horses/horses-states';
import { MediaTile } from '@/components/media/media-tile';
import { ScrubTimeline } from '@/components/timeline/scrub-timeline';
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
import { stallFrameUrl, stallHasFrame, stallRecordedStreamUrl } from '@/hooks/horses-data';
import { deriveOverlay } from '@/hooks/horse-status-data';
import { dayLabel, isToday, latestSelectable, readingsAtLabel } from '@/hooks/playhead-data';
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
 * in-stall, sensor-bundle and activeness queries (3). The current app's
 * Summary tab costs ~30
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  /**
   * The hero streams only when asked, and only while this screen is on top.
   * Slice 4a proved the tile on For You's Snapshots first; the horse page
   * inherits it rather than being the place it runs for the first time.
   */
  const [wantsLive, setWantsLive] = useState(false);
  const [streamFailed, setStreamFailed] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const listRef = useRef<FlatList<HistoryEvent>>(null);

  const isSample = PREVIEWS.sampleHorsesData && id.startsWith('sample-');
  const horse = useHorseDetail(id);
  const playhead = usePlayhead(now, horse.createdAt);

  // Sample horses have no Prometheus data to honestly show — the Summary
  // tab stays exactly as slice 1 left it for them, rather than pretending a
  // fictional horse has live readings.
  const overlay = isSample
    ? 'none'
    : deriveOverlay({
        stall: horse.stall,
        hasResolvedStall: horse.hasResolvedStall,
        detailsFailed: horse.detailsFailed,
        historicalAssignmentKnown: playhead.isLive,
        now,
      });
  const status = useHorseStatus({
    stall: horse.stall,
    cursor: playhead.cursor,
    isLive: playhead.isLive,
    nowMillis: now.toMillis(),
    enabled: !isSample && overlay === 'none',
  });

  // Both follow the date bar. The bar sits in the page frame, above the tabs,
  // so the day it selects governs every tab — the same place the current app
  // puts its date toolbar. Scoping the bar to Summary alone left the other two
  // tabs quietly showing a different period (review, 2026-08-17).
  const events = useReviewHistory({
    day: playhead.day,
    animalId: id,
    windowDays: EVENT_WINDOW_DAYS,
    enabled: !isSample && activeTab === 'events',
  });
  const alerts = useReviewHistory({
    day: playhead.day,
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
  /** One phrase for the window, so the header and the empty state agree. */
  const windowLabel = isToday(playhead.day, now)
    ? `Last ${EVENT_WINDOW_DAYS} days`
    : `${EVENT_WINDOW_DAYS} days to ${dayLabel(playhead.day, now)}`;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const tabRefresh =
        activeTab === 'summary'
          ? status.refetch()
          : activeTab === 'events'
            ? events.refetch()
            : alerts.refetch();
      await Promise.all([horse.refresh(), tabRefresh]);
    } finally {
      setIsRefreshing(false);
    }
  }, [horse, activeTab, status, events, alerts]);

  const onEndReached = useCallback(() => {
    if (activeTab === 'summary' || isSample) return;
    if (active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
  }, [activeTab, isSample, active]);

  // Navigating away releases the player; coming back shows the still again
  // and you opt in deliberately.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setWantsLive(false);
      };
      // Setters are stable, but the React Compiler requires them declared.
    }, [setIsFocused, setWantsLive]),
  );

  /**
   * Live when the play-head is tracking now; an hour of recorded footage from
   * the cursor when it is not. The date bar is what moves between them, so the
   * same tap means "watch this stall" on any day.
   */
  const streamUri = isSample
    ? undefined
    : playhead.isLive
      ? horse.liveUri
      : stallRecordedStreamUrl(horse.stall, playhead.cursor);

  /**
   * The still under the hero follows the date bar too.
   *
   * `horse.row.imageUri` is always the LATEST frame, so on a past day the page
   * showed a picture from a minute ago with nothing saying so — you only found
   * out by pressing play and watching a different scene appear. On a past day
   * the still is the frame nearest the cursor instead.
   */
  const posterUri =
    !isSample && !playhead.isLive
      ? (stallFrameUrl(horse.stall, playhead.cursor.toUnixInteger()) ?? horse.row?.imageUri)
      : horse.row?.imageUri;
  const canStream = !!streamUri && !streamFailed;
  const streaming = wantsLive && canStream && isFocused;

  const onChangeDay = useCallback(
    (next: DateTime) => {
      // Stop first: the stream URL changes with the cursor, and a player left
      // running would silently jump to a different hour.
      setWantsLive(false);
      setStreamFailed(false);
      playhead.setDay(next);
    },
    [playhead, setWantsLive, setStreamFailed],
  );

  const onBackToToday = useCallback(() => {
    setWantsLive(false);
    setStreamFailed(false);
    playhead.resetToToday();
  }, [playhead, setWantsLive, setStreamFailed]);

  const onToggleLive = useCallback(() => {
    setStreamFailed(false);
    setWantsLive((current) => !current);
  }, [setStreamFailed, setWantsLive]);

  const onChangeTab = useCallback((tab: DetailTab) => {
    setWantsLive(false);
    setActiveTab(tab);
  }, [setWantsLive, setActiveTab]);

  /**
   * Event rows are bookmarks into the one horse timeline, not a second video
   * player. This is the approved E2 behaviour: move the play-head to the
   * event instant and return to Summary, where the hero and metrics agree on
   * the same moment.
   */
  const onOpenEventMoment = useCallback(
    (event: HistoryEvent) => {
      const at = DateTime.fromISO(event.startTime, { setZone: true });
      if (!at.isValid) return;

      setWantsLive(false);
      setStreamFailed(false);
      playhead.setCursor(timezone ? at.setZone(timezone) : at);
      setActiveTab('summary');
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    },
    [playhead, timezone, setWantsLive, setStreamFailed, setActiveTab],
  );

  /**
   * Scrubbing (slice 4c) commits an instant, not a day — the date bar and the
   * timeline are two controls over one position. Both stop the hero first, for
   * the reason `onChangeDay` gives: the stream URL is derived from the cursor,
   * so a player left running would silently jump to a different hour.
   */
  const onScrub = useCallback(
    (at: DateTime) => {
      setWantsLive(false);
      setStreamFailed(false);
      playhead.setCursor(at);
    },
    [playhead, setWantsLive, setStreamFailed],
  );

  const onScrubbingChange = useCallback(
    (active: boolean) => {
      if (active) setWantsLive(false);
    },
    [setWantsLive],
  );

  /**
   * Only a stall we can actually fetch frames for gets a timeline. Scrubbing a
   * track for footage that does not exist is a dead control with a gesture.
   */
  const showTimeline = !isSample && stallHasFrame(horse.stall);

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
        ref={listRef}
        data={listData}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={item.startTime ? () => onOpenEventMoment(item) : undefined}
            actionHint="tap to view this moment in Summary"
          />
        )}
        ItemSeparatorComponent={ListGap}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || horse.isRefreshing}
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
              posterUri={posterUri}
              blurhash={horse.row?.blurhash}
              videoUri={streaming ? streamUri : undefined}
              live={streaming}
              onPlaybackError={() => setStreamFailed(true)}
              onPress={canStream ? onToggleLive : undefined}
              showPlayBadge={canStream && !streaming}
              tag={
                streaming
                  ? playhead.isLive
                    ? { label: 'LIVE', tone: 'alert' }
                    : { label: `From ${playhead.cursor.toFormat('h:mm a')}` }
                  : streamFailed
                    ? { label: 'Footage unavailable' }
                    : horse.row && !horse.row.hasCamera
                      ? { label: 'No camera' }
                      : undefined
              }
              accessibilityLabel={
                streaming
                  ? `${name} ${playhead.isLive ? 'live camera' : 'recorded footage'}, tap to stop`
                  : canStream
                    ? `${name} camera frame, tap to watch ${
                        playhead.isLive ? 'live' : `from ${playhead.cursor.toFormat('h:mm a')}`
                      }`
                    : `${name} camera frame`
              }
              style={styles.hero}
            />

            {/*
              Directly under the hero, where the current app puts it: the
              track you drag is next to the picture it changes.
            */}
            {showTimeline ? (
              <ScrubTimeline
                cursor={playhead.cursor}
                latest={latestSelectable(now)}
                earliest={horse.createdAt}
                zone={timezone}
                isLive={playhead.isLive}
                onScrub={onScrub}
                onScrubbingChange={onScrubbingChange}
              />
            ) : null}

            <View style={styles.titleBlock}>
              <Text style={[type.largeTitle, { color: colors.foreground }]}>{name}</Text>
              <Text style={[type.headline, { color: colors.secondary }]}>
                {horse.row?.stallName ?? 'No stall'}
              </Text>
            </View>

            {/*
              Page frame, not the Summary tab: the selected day governs the
              readings AND both event lists, so the control that sets it has to
              be visible from all three. This is where the current app puts its
              date toolbar too.
            */}
            {!isSample ? (
              <HorseDateBar
                day={playhead.day}
                now={now}
                earliest={horse.createdAt}
                onChange={onChangeDay}
                onToday={onBackToToday}
              />
            ) : null}

            <SegmentedControl<DetailTab>
              options={TABS}
              value={activeTab}
              onChange={onChangeTab}
              width={Math.max(width - TAB_WIDTH_INSET, 260)}
              accessibilityLabel="Horse sections"
              testID="horse-detail-tabs"
            />

            {activeTab === 'summary' ? (
              <View style={styles.summary}>
                {!isSample ? (
                  overlay !== 'none' ? (
                    <HorseDetailNotice overlay={overlay} />
                  ) : (
                    <>
                      <HorseStatusStrip
                        status={status.status}
                        readings={status.readings}
                        atLabel={readingsAtLabel({
                          isLive: playhead.isLive,
                          day: playhead.day,
                          // The slice the readings were queried at, not the
                          // cursor — see `readingsAtLabel` (CQ-7).
                          readAt: status.readAt,
                          zone: timezone ?? now.zoneName ?? 'UTC',
                          now,
                        })}
                      />
                      {status.hasMonitor ? <BuiltInSettingsNote /> : null}
                    </>
                  )
                ) : null}
                {/* Section order matches the shipping app (Inakshi, 2026-09-07):
                    Last 24 hours, Horse Trends, then the Stall card holding
                    every stall chart — Horse in Stall, Lying Down, and the rest
                    as they are built. */}
                {PREVIEWS.last24HoursSampleData ? (
                  <View
                    style={[
                      styles.last24Card,
                      { backgroundColor: colors.card, borderColor: colors.divider },
                    ]}>
                    <Last24HoursCard
                      data={buildLast24Hours({
                        endsAt: playhead.isLive ? now : playhead.cursor,
                        zone: timezone ?? now.zoneName ?? 'UTC',
                        segments: last24OrdinaryDay,
                      })}
                      width={width - TAB_WIDTH_INSET - space.lg * 2}
                    />
                    <Text
                      style={[
                        type.micro,
                        styles.last24Sample,
                        { color: colors.tertiary },
                      ]}>
                      Sample data — not this horse
                    </Text>
                  </View>
                ) : null}
                {PREVIEWS.horseTrendsSampleData ? (
                  <View
                    style={[
                      styles.last24Card,
                      { backgroundColor: colors.card, borderColor: colors.divider },
                    ]}>
                    <HorseTrendsCard
                      activeness={buildActivenessDay({
                        samples: activenessWithGap(now),
                        now,
                      })}
                      rollingEvents={rollingWeekFixture(now).filter(
                        (event) => event.at >= now.minus({ hours: 24 }).toSeconds(),
                      )}
                      rollingWeek={buildRollingWeek({
                        events: rollingWeekFixture(now),
                        previousEvents: rollingPreviousWeek(now),
                        observedDays: observedDaysWithOutage(now, 6),
                        zone: timezone ?? now.zoneName ?? 'UTC',
                        now,
                      })}
                      zone={timezone ?? now.zoneName ?? 'UTC'}
                      now={now}
                      width={width - TAB_WIDTH_INSET - space.lg * 2}
                    />
                    <Text
                      style={[
                        type.micro,
                        styles.last24Sample,
                        { color: colors.tertiary },
                      ]}>
                      Sample data — not this horse
                    </Text>
                  </View>
                ) : null}
                <HorseStallCard stallName={horse.row?.stallName}>
                  {PREVIEWS.lyingDownTimelineSampleData ? (
                    <View testID="horse-lying-down-section">
                      <View style={styles.timelineHeader}>
                        <Text style={[type.headline, { color: colors.foreground }]}>Lying Down</Text>
                        <Text style={[type.micro, { color: colors.tertiary }]}>
                          7 days to {now.toFormat('ccc d MMM')}
                        </Text>
                      </View>
                      <LyingDownTimeline
                        timeline={buildLyingDownTimeline({
                          result: lyingDownPreviewWeek(timezone ?? now.zoneName ?? 'UTC', now),
                          selectedDate: now.toFormat('yyyy-MM-dd'),
                          zone: timezone ?? now.zoneName ?? 'UTC',
                          now,
                          // Assigned to this stall on the Tuesday of the preview week.
                          assignedAt: now.minus({ days: 2 }).startOf('day').plus({ hours: 12, minutes: 10 }).toSeconds(),
                        })}
                        width={width - TAB_WIDTH_INSET - space.card * 2}
                        testID="horse-lying-down-timeline"
                      />
                      <Text
                        style={[
                          type.micro,
                          styles.last24Sample,
                          { color: colors.tertiary },
                        ]}>
                        Sample data — not this horse
                      </Text>
                    </View>
                  ) : null}
                </HorseStallCard>
                <HorsePassport fields={passport} />
              </View>
            ) : (
              <View style={styles.tabIntro}>
                <Text style={[type.footnote, { color: colors.tertiary }]}>{windowLabel}</Text>
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
            <EmptyTab tab={activeTab} windowLabel={windowLabel} />
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

function EmptyTab({ tab, windowLabel }: { tab: DetailTab; windowLabel: string }) {
  const { colors } = useTokens();
  const isAlerts = tab === 'alerts';
  return (
    <View style={[styles.state, { backgroundColor: colors.bed }]} testID={`horse-${tab}-empty`}>
      <Icon name={isAlerts ? 'alerts' : 'info'} size={20} color={colors.accent} />
      <Text style={[type.subhead, styles.stateText, { color: colors.secondary }]}>
        {/*
          Uses the same window phrase as the header. Hard-coding "the last 10
          days" here contradicted the header the moment the date bar moved off
          today (caught on device, 2026-08-17).
        */}
        {isAlerts
          ? `No alerts for this horse — ${windowLabel.toLowerCase()}.`
          : `Nothing recorded for this horse — ${windowLabel.toLowerCase()}.`}
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
  last24Card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.lg,
  },
  last24Sample: { textAlign: "center", marginTop: space.md },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: space.md,
  },
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
