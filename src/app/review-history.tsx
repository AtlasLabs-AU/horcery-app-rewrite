import { router } from 'expo-router';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayStrip } from '@/components/review-history/day-strip';
import { EventCard, type HistoryEvent } from '@/components/review-history/event-card';
import { formatEventTime, toHistoryEvents } from '@/components/review-history/event-rows';
import { Icon, type IconName } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { useForYouData } from '@/hooks/use-for-you-data';
import { useOrganizationNow } from '@/hooks/use-organization-now';
import {
  BEHAVIOR_EVENT_TYPES,
  DEFAULT_EVENT_TYPES,
  useReviewHistory,
} from '@/hooks/use-review-history';
import { PREVIEWS } from '@/config/previews';
import { sampleHistoryFor } from '@/config/sample/review-history-sample';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Review History — the current app's screen, rebuilt.
 *
 * Same shape as today: title, day navigator + strip, three filter chips, a
 * list of event cards, empty / loading / error states. What differs is
 * underneath and is listed in `Horcery_Review_History_Scope.md` §3; the
 * customer-visible departures are:
 *
 * 1. Cards show a still with a play badge instead of each mounting its own
 *    autoplaying video player (the current app never releases them).
 * 2. Alerts are included by default, so there is one History rather than a
 *    separate alert-only deep link.
 * 3. Days are the ORGANIZATION's days, not the phone's.
 * 4. "Lying Down" actually appears, and "Partial Rolling" returns all three
 *    of its event types — two live bugs in the current screen.
 * 5. Future days cannot be selected.
 *
 * Controls whose pickers are not built yet (Horse, Stall) are visible but
 * dimmed, per Inakshi 2026-08-15, so the whole composition can be judged.
 */

type BehaviorKey = keyof typeof BEHAVIOR_EVENT_TYPES;

/**
 * The current app's seven behaviour rows, same order and same wording. Ported
 * from `behavior-constants.ts`, not re-imagined — see the note in
 * `use-review-history.ts`.
 */
const BEHAVIOR_OPTIONS: { id: BehaviorKey; label: string; icon: IconName }[] = [
  { id: 'rolling', label: 'Rolling', icon: 'rolling' },
  { id: 'partialRolling', label: 'Partial Rolling', icon: 'rolling' },
  { id: 'lyingDown', label: 'Lying Down', icon: 'lyingDown' },
  { id: 'peoplePresent', label: 'People Present', icon: 'peopleInStall' },
  { id: 'peopleInteraction', label: 'People Interaction', icon: 'peopleInteraction' },
  { id: 'exiting', label: 'Exiting', icon: 'exiting' },
  { id: 'entering', label: 'Entering', icon: 'entering' },
];


export default function ReviewHistoryScreen() {
  const { colors } = useTokens();
  const { timezone } = useForYouData();
  const now = useOrganizationNow(timezone);
  const [selectedDay, setSelectedDay] = useState<DateTime | null>(null);
  /** Multi-select, like the current app's sheet. Empty means "no filter". */
  const [behaviors, setBehaviors] = useState<BehaviorKey[]>([]);
  const [playingEventId, setPlayingEventId] = useState<string | null>(null);

  // Default to the barn's today, and follow it if the day rolls over while
  // the screen is open.
  const day = selectedDay ?? now;

  const eventTypes = useMemo(() => {
    if (behaviors.length === 0) return DEFAULT_EVENT_TYPES;
    return behaviors.flatMap((key) => [...BEHAVIOR_EVENT_TYPES[key]]);
  }, [behaviors]);

  const toggleBehavior = useCallback((key: BehaviorKey) => {
    setBehaviors((current) =>
      current.includes(key) ? current.filter((id) => id !== key) : [...current, key],
    );
  }, []);

  const {
    events,
    total,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useReviewHistory({ day, eventTypes });

  const rows = useMemo<HistoryEvent[]>(
    () => toHistoryEvents(events, { timezone }),
    [events, timezone],
  );

  /**
   * Sample data fills in ONLY when a dev build opted in and the organization
   * genuinely has nothing on this day. Real events always win, and the banner
   * below says which you are looking at.
   */
  const usingSample =
    PREVIEWS.sampleHistoryData && !isLoading && !isError && rows.length === 0;
  const visibleRows = usingSample
    ? filterSample(sampleHistoryFor(day), behaviors).map((row) => ({
        ...row,
        timeLabel: formatEventTime(row.startTime, timezone),
      }))
    : rows;

  const filterActive = behaviors.length > 0;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const togglePlayback = useCallback((id: string) => {
    setPlayingEventId((current) => (current === id ? null : id));
  }, []);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="history-back">
            <Icon name="back" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[type.title, styles.headerTitle, { color: colors.foreground }]}>
            Review History
          </Text>
        </View>

        <DayStrip selected={day} today={now} onSelect={setSelectedDay} />

        <View style={styles.filterRow}>
          {/* The native menu needs a fixed box; the wrapper stops the flex row
              shrinking it and clipping the label to "ehavior (". */}
          <View style={styles.behaviorSlot}>
            <Menu
              label={filterActive ? `Behavior (${behaviors.length})` : 'Behavior'}
              accessibilityLabel="Filter by behavior"
              title="Filter by behaviour"
              // The sheet stays open while you tick: the dropdown this
              // replaced closed on every tap, so choosing three behaviours
              // meant opening it three times (Inakshi, 2026-08-17).
              multiSelect
              width={150}
              height={36}
              testID="history-behavior-filter"
              actions={BEHAVIOR_OPTIONS.map((option) => ({
                id: option.id,
                label: option.label,
                icon: option.icon,
                selected: behaviors.includes(option.id),
                onPress: () => toggleBehavior(option.id),
              }))}
            />
          </View>
          <DimmedChip label="Horse" />
          <DimmedChip label="Stall" />
        </View>

        {filterActive ? (
          <View style={styles.resultsRow}>
            <Text style={[type.footnote, { color: colors.tertiary }]}>
              {`${usingSample ? visibleRows.length : total} ${
                (usingSample ? visibleRows.length : total) === 1 ? 'result' : 'results'
              } found`}
            </Text>
            <Pressable
              onPress={() => setBehaviors([])}
              hitSlop={8}
              accessibilityRole="button"
              testID="history-reset-filters">
              <Text style={[type.footnote, { color: colors.accent, fontWeight: '600' }]}>
                Reset
              </Text>
            </Pressable>
          </View>
        ) : null}

        {usingSample ? <SampleBanner /> : null}

        {isLoading ? (
          <View style={styles.centre} testID="history-loading">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <FlatList
            data={visibleRows}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                playing={playingEventId === item.id}
                onPress={item.videoUri ? () => togglePlayback(item.id) : undefined}
                onPlaybackError={() =>
                  setPlayingEventId((current) => (current === item.id ? null : current))
                }
              />
            )}
            contentContainerStyle={styles.listContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
            ListEmptyComponent={<EmptyState filtered={filterActive} />}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.footerSpinner} />
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

/** Says plainly that these events are invented. Dev builds only. */
function SampleBanner() {
  const { colors } = useTokens();
  return (
    <View
      style={[styles.sampleBanner, { backgroundColor: colors.fillTonal }]}
      testID="history-sample-banner">
      <Icon name="info" size={14} color={colors.accent} />
      <Text style={[type.footnote, styles.sampleText, { color: colors.secondary }]}>
        Sample events — this organization has none on this day.
      </Text>
    </View>
  );
}

/** Sample rows honour the behavior filter, so filtering still demonstrates. */
function filterSample(rows: HistoryEvent[], behaviors: BehaviorKey[]): HistoryEvent[] {
  if (behaviors.length === 0) return rows;
  const wanted = new Set(
    behaviors.map(
      (key) => BEHAVIOR_OPTIONS.find((option) => option.id === key)?.label ?? '',
    ),
  );
  return rows.filter((row) => wanted.has(row.title));
}

/** Horse / Stall — visible so the composition reads, dimmed until built. */
function DimmedChip({ label }: { label: string }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.divider }]}>
      <Text style={[type.subhead, { color: colors.tertiary }]}>{label}</Text>
      <Icon name="chevronRight" size={12} color={colors.dimmed} />
    </View>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.state, { backgroundColor: colors.bed }]} testID="history-empty">
      <Icon name="info" size={20} color={colors.accent} />
      <Text style={[type.subhead, styles.stateText, { color: colors.secondary }]}>
        {filtered
          ? 'No events match these filters on this day. Try another behavior or a different day.'
          : 'Nothing happened on this day. Pick another day to see earlier events.'}
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.state, { backgroundColor: colors.bed }]} testID="history-error">
      <Icon name="info" size={20} color={colors.statusAlert} />
      <View style={styles.stateText}>
        <Text style={[type.subhead, { color: colors.foreground }]}>
          We couldn&apos;t load this day.
        </Text>
        <Text style={[type.footnote, { color: colors.secondary }]}>
          Check your connection and try again.
        </Text>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          testID="history-retry"
          style={styles.retry}>
          <Text style={[type.subhead, { color: colors.accent, fontWeight: '600' }]}>
            Try again
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  headerTitle: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.edge,
    paddingTop: space.md,
  },
  behaviorSlot: { width: 150, height: 36, flexShrink: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingTop: space.sm,
  },
  listContent: {
    padding: space.edge,
    gap: space.md,
    flexGrow: 1,
  },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  state: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    margin: space.edge,
    padding: space.edge,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  stateText: { flex: 1, gap: space.xs },
  retry: { paddingTop: space.sm },
  footerSpinner: { paddingVertical: space.edge },
  sampleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.edge,
    marginTop: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  sampleText: { flex: 1 },
});
