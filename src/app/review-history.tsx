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

import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import { DayStrip } from '@/components/review-history/day-strip';
import { EventCard, type HistoryEvent } from '@/components/review-history/event-card';
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

type BehaviorFilter = 'all' | keyof typeof BEHAVIOR_EVENT_TYPES | 'alerts';

const BEHAVIOR_OPTIONS: { id: BehaviorFilter; label: string }[] = [
  { id: 'all', label: 'All behaviors' },
  { id: 'lyingDown', label: 'Lying Down' },
  { id: 'partialRolling', label: 'Partial Rolling' },
  { id: 'peopleInStall', label: 'People in Stall' },
  { id: 'standing', label: 'Standing' },
  { id: 'alerts', label: 'Alerts' },
];

const ICON_FOR_TYPE: Record<number, IconName> = {
  100: 'lyingDown',
  101: 'peopleInStall',
  102: 'inStall',
  103: 'alerts',
  104: 'alerts',
  105: 'alerts',
  [EVENT_TYPE_ID.alert]: 'alerts',
  [EVENT_TYPE_ID.stallCheck]: 'info',
  [EVENT_TYPE_ID.waterCheck]: 'humidity',
  [EVENT_TYPE_ID.stallCleaning]: 'info',
};

export default function ReviewHistoryScreen() {
  const { colors } = useTokens();
  const { timezone } = useForYouData();
  const now = useOrganizationNow(timezone);
  const [selectedDay, setSelectedDay] = useState<DateTime | null>(null);
  const [behavior, setBehavior] = useState<BehaviorFilter>('all');

  // Default to the barn's today, and follow it if the day rolls over while
  // the screen is open.
  const day = selectedDay ?? now;

  const eventTypes = useMemo(() => {
    if (behavior === 'all') return DEFAULT_EVENT_TYPES;
    if (behavior === 'alerts') return [EVENT_TYPE_ID.alert];
    return [...BEHAVIOR_EVENT_TYPES[behavior]];
  }, [behavior]);

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
    () =>
      events.map((event) => {
        const typeId = event.event_type ?? 0;
        const isAlert =
          typeId === EVENT_TYPE_ID.alert || [103, 104, 105].includes(typeId);
        const stall =
          typeof event.stall_id === 'object' ? event.stall_id : event.stall;
        const durationSeconds = Number(event.duration ?? 0);
        return {
          id: event.id ?? `${event.start_time}-${typeId}`,
          title: event.title,
          startTime: event.start_time ?? '',
          timeLabel: formatEventTime(event.start_time, timezone),
          // Only behaviour events with real duration have footage — the guard
          // the current app added to History but never back-ported to For You.
          hasClip: durationSeconds > 0,
          durationLabel: durationSeconds > 0 ? formatDuration(durationSeconds) : undefined,
          blurhash: event.event_blur_hash,
          animalName: event.animal?.animal_name ?? event.animal?.registered_name,
          stallName: stall?.name,
          reporter:
            typeof event.created_by === 'object'
              ? [event.created_by.first_name, event.created_by.last_name]
                  .filter(Boolean)
                  .join(' ')
              : undefined,
          note: event.description,
          isAlert,
          icon: ICON_FOR_TYPE[typeId] ?? 'info',
        };
      }),
    [events],
  );

  /**
   * Sample data fills in ONLY when a dev build opted in and the organization
   * genuinely has nothing on this day. Real events always win, and the banner
   * below says which you are looking at.
   */
  const usingSample =
    PREVIEWS.sampleHistoryData && !isLoading && !isError && rows.length === 0;
  const visibleRows = usingSample
    ? filterSample(sampleHistoryFor(day), behavior).map((row) => ({
        ...row,
        timeLabel: formatEventTime(row.startTime, timezone),
      }))
    : rows;

  const filterActive = behavior !== 'all';

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
          <Menu
            label={BEHAVIOR_OPTIONS.find((option) => option.id === behavior)?.label ?? 'Behavior'}
            accessibilityLabel="Filter by behavior"
            width={150}
            height={36}
            testID="history-behavior-filter"
            actions={BEHAVIOR_OPTIONS.map((option) => ({
              id: option.id,
              label: option.label,
              selected: option.id === behavior,
              onPress: () => setBehavior(option.id),
            }))}
          />
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
              onPress={() => setBehavior('all')}
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
            renderItem={({ item }) => <EventCard event={item} />}
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
function filterSample(rows: HistoryEvent[], behavior: BehaviorFilter): HistoryEvent[] {
  if (behavior === 'all') return rows;
  if (behavior === 'alerts') return rows.filter((row) => row.isAlert);
  const titles: Record<string, string> = {
    lyingDown: 'Lying Down',
    partialRolling: 'Rolling',
    peopleInStall: 'People in Stall',
    standing: 'Standing',
  };
  return rows.filter((row) => row.title === titles[behavior]);
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

/** Timestamps are shown in the barn's zone, never the phone's (§6c). */
function formatEventTime(iso: string | undefined, timezone?: string | null) {
  if (!iso) return '';
  const time = DateTime.fromISO(iso);
  return (timezone ? time.setZone(timezone) : time).toFormat('dd LLL yyyy h:mm a');
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
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
