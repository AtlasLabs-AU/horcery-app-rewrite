import { DateTime } from 'luxon';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';
import {
  SAMPLE_EVENTS,
  type EventCategory,
  type SampleEvent,
} from '@/app/proto-history/sample-events';

/**
 * PROTOTYPE — Review History, two layouts.
 *
 * Decisions this is built to (requirements §6c, Inakshi 2026-08-15):
 * grouped by day with a date range rather than one day at a time; the barn's
 * timezone; ALERTS INCLUDED by default with a filter; stills that play on
 * tap, never a wall of live players; one screen whose filters are real and
 * editable no matter which entry point you arrive from.
 *
 * The two candidates:
 *   Timeline — sticky day headers, one column of cards, tap opens playback.
 *   Player   — a pinned 4:3 player on top, list of stills beneath; tapping a
 *              row loads it into the player without leaving the screen.
 *              (Inakshi's suggestion; the Ring / Nest / YouTube pattern.)
 *
 * Both obey the one-player rule: exactly one `useVideoPlayer` on the screen.
 *
 * Controls with nowhere to go yet are VISIBLE BUT DIMMED, per Inakshi
 * 2026-08-15 — she needs the whole composition to sign off look and feel,
 * and functionality lands screen by screen afterwards.
 *
 * Sample data — see sample-events.ts for why.
 */

type Layout = 'timeline' | 'player';
const LAYOUTS: { label: string; value: Layout }[] = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Player', value: 'player' },
];

type Filter = 'all' | EventCategory;
const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Behavior', value: 'behavior' },
  { label: 'People', value: 'people' },
  { label: 'Alerts', value: 'alert' },
];

const CATEGORY_ICON = {
  behavior: 'lyingDown',
  people: 'peopleInStall',
  alert: 'alerts',
} as const;

export default function ProtoHistoryScreen() {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const [layout, setLayout] = useState<Layout>('timeline');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState(SAMPLE_EVENTS[0].id);

  const events = useMemo(
    () =>
      filter === 'all'
        ? SAMPLE_EVENTS
        : SAMPLE_EVENTS.filter((event) => event.category === filter),
    [filter],
  );

  /** Grouped by day — the change from the current app's one-day-at-a-time strip. */
  const sections = useMemo(() => {
    const byDay = new Map<string, SampleEvent[]>();
    for (const event of events) {
      const day = event.at.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), event]);
    }
    return [...byDay.entries()].map(([day, data]) => ({ day, data }));
  }, [events]);

  const selected =
    events.find((event) => event.id === selectedId) ?? events[0] ?? SAMPLE_EVENTS[0];

  // THE one player on this screen, whichever layout is showing.
  const player = useVideoPlayer(selected.clip ?? null, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  const selectEvent = useCallback((event: SampleEvent) => {
    setSelectedId(event.id);
  }, []);

  const playerHeight = Math.round(((width - space.edge * 2) * 3) / 4);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backButton}>
            <Icon name="back" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[type.largeTitle, styles.headerTitle, { color: colors.foreground }]}>
            History
          </Text>
          <Menu
            icon="overflow"
            accessibilityLabel="History options"
            width={32}
            actions={[
              { id: 'export', label: 'Export…', icon: 'external', disabled: true },
              { id: 'jump', label: 'Jump to date…', icon: 'clock', disabled: true },
            ]}
          />
        </View>

        {/* Prototype scaffolding — which layout you are judging. */}
        <View style={styles.scaffold}>
          <SegmentedControl
            options={LAYOUTS}
            value={layout}
            onChange={setLayout}
            width={width - space.edge * 2}
            testID="proto-history-layout"
          />
        </View>

        <DateRangeBar />

        <View style={styles.filterRow}>
          <SegmentedControl
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            width={width - space.edge * 2}
            testID="proto-history-filter"
          />
        </View>

        <EntityFilters />

        {layout === 'player' ? (
          <PinnedPlayerLayout
            sections={sections}
            selected={selected}
            player={player}
            height={playerHeight}
            onSelect={selectEvent}
          />
        ) : (
          <TimelineLayout sections={sections} onSelect={selectEvent} />
        )}
      </SafeAreaView>
    </View>
  );
}

/**
 * Date range — replaces the current app's single-day strip. Dimmed: the
 * picker itself is a later step, the shape is what is being judged now.
 */
function DateRangeBar() {
  const { colors } = useTokens();
  return (
    <View style={styles.rangeRow}>
      <Pressable
        disabled
        style={[styles.rangeChip, { backgroundColor: colors.card, borderColor: colors.divider }]}>
        <Icon name="clock" size={14} color={colors.dimmed} />
        <Text style={[type.subhead, { color: colors.tertiary }]}>
          13–15 Aug 2026
        </Text>
        <Icon name="chevronRight" size={12} color={colors.dimmed} />
      </Pressable>
      <Text style={[type.footnote, { color: colors.dimmed }]}>Barn time</Text>
    </View>
  );
}

/** Horse and Stall filters — visible, dimmed until their pickers exist. */
function EntityFilters() {
  const { colors } = useTokens();
  return (
    <View style={styles.entityRow}>
      {(['Horse', 'Stall'] as const).map((label) => (
        <Pressable
          key={label}
          disabled
          style={[styles.entityChip, { backgroundColor: colors.card, borderColor: colors.divider }]}>
          <Text style={[type.subhead, { color: colors.tertiary }]}>{label}</Text>
          <Icon name="chevronRight" size={12} color={colors.dimmed} />
        </Pressable>
      ))}
    </View>
  );
}

type Section = { day: string; data: SampleEvent[] };

function dayLabel(day: string) {
  const date = DateTime.fromISO(day);
  const today = DateTime.fromISO('2026-08-15');
  if (date.hasSame(today, 'day')) return 'Today';
  if (date.hasSame(today.minus({ days: 1 }), 'day')) return 'Yesterday';
  return date.toFormat('cccc d LLLL');
}

function timeLabel(at: string) {
  return DateTime.fromISO(at).toFormat('h:mm a').toLowerCase();
}

/** Layout A — one column, sticky day headers, tap a card to play it. */
function TimelineLayout({
  sections,
  onSelect,
}: {
  sections: Section[];
  onSelect: (event: SampleEvent) => void;
}) {
  const { colors } = useTokens();
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.listContent}
      renderSectionHeader={({ section }) => (
        <View style={[styles.dayHeader, { backgroundColor: colors.background }]}>
          <Text style={[type.eyebrow, { color: colors.tertiary }]}>
            {dayLabel((section as Section).day)}
          </Text>
        </View>
      )}
      renderItem={({ item }) => <TimelineCard event={item} onPress={() => onSelect(item)} />}
      ListEmptyComponent={<EmptyState />}
    />
  );
}

function TimelineCard({ event, onPress }: { event: SampleEvent; onPress: () => void }) {
  const { colors } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.horse}, ${timeLabel(event.at)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        pressed && { opacity: 0.85 },
      ]}>
      {event.clip ? (
        <Still durationLabel={event.durationLabel} />
      ) : (
        <View style={[styles.noteBlock, { backgroundColor: colors.bed }]}>
          <Icon name="info" size={16} color={colors.accent} />
          <Text style={[type.footnote, styles.noteText, { color: colors.secondary }]}>
            {event.note}
          </Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={[styles.categoryWell, { backgroundColor: colors.fillTonal }]}>
          <Icon name={CATEGORY_ICON[event.category]} size={16} color={colors.accent} />
        </View>
        <View style={styles.cardText}>
          <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>
            {`${event.horse} · ${event.stall} · ${timeLabel(event.at)}`}
          </Text>
        </View>
        {event.category === 'alert' ? <AlertPill /> : null}
      </View>
    </Pressable>
  );
}

/**
 * A still frame. Rendered as a tonal block rather than a mounted player —
 * that IS the design decision being judged (one player per screen, never one
 * per row, which is what melts a tablet in the current app).
 */
function Still({ durationLabel }: { durationLabel?: string }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.still, { backgroundColor: colors.fillTonal }]}>
      <View style={[styles.playBadge, { backgroundColor: colors.card }]}>
        <Icon name="spaces" size={16} color={colors.accent} />
      </View>
      {durationLabel ? (
        <View style={[styles.durationPill, { backgroundColor: colors.inverse }]}>
          <Text style={[type.caption, { color: colors.onInverse }]}>{durationLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AlertPill() {
  const { colors } = useTokens();
  return (
    <View style={[styles.alertPill, { backgroundColor: colors.statusAlert }]}>
      <Text style={[type.caption, { color: '#FFFFFF', fontWeight: '600' }]}>Alert</Text>
    </View>
  );
}

/** Layout B — pinned player on top, scrollable stills beneath. */
function PinnedPlayerLayout({
  sections,
  selected,
  player,
  height,
  onSelect,
}: {
  sections: Section[];
  selected: SampleEvent;
  player: ReturnType<typeof useVideoPlayer>;
  height: number;
  onSelect: (event: SampleEvent) => void;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.page}>
      <View style={[styles.playerFrame, { height, backgroundColor: colors.fillTonal }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls
        />
      </View>
      <View style={styles.nowPlaying}>
        <View style={[styles.categoryWell, { backgroundColor: colors.fillTonal }]}>
          <Icon name={CATEGORY_ICON[selected.category]} size={16} color={colors.accent} />
        </View>
        <View style={styles.cardText}>
          <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
            {selected.title}
          </Text>
          <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>
            {`${selected.horse} · ${selected.stall} · ${timeLabel(selected.at)}`}
          </Text>
        </View>
        {selected.category === 'alert' ? <AlertPill /> : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.railContent}
        renderSectionHeader={({ section }) => (
          <View style={[styles.dayHeader, { backgroundColor: colors.background }]}>
            <Text style={[type.eyebrow, { color: colors.tertiary }]}>
              {dayLabel((section as Section).day)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RailRow
            event={item}
            active={item.id === selected.id}
            onPress={() => onSelect(item)}
          />
        )}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}

function RailRow({
  event,
  active,
  onPress,
}: {
  event: SampleEvent;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${event.title}, ${event.horse}, ${timeLabel(event.at)}`}
      style={({ pressed }) => [
        styles.railRow,
        { backgroundColor: active ? colors.bed : colors.card },
        pressed && { opacity: 0.85 },
      ]}>
      <View style={[styles.railStill, { backgroundColor: colors.fillTonal }]}>
        <Icon name={event.clip ? 'spaces' : 'info'} size={14} color={colors.accent} />
      </View>
      <View style={styles.cardText}>
        <Text
          style={[type.subhead, { color: colors.foreground, fontWeight: active ? '700' : '400' }]}
          numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>
          {`${event.horse} · ${timeLabel(event.at)}`}
        </Text>
      </View>
      {event.category === 'alert' ? <AlertPill /> : null}
      {event.durationLabel ? (
        <Text style={[type.caption, { color: colors.dimmed }]}>{event.durationLabel}</Text>
      ) : null}
    </Pressable>
  );
}

function EmptyState() {
  const { colors } = useTokens();
  return (
    <View style={[styles.empty, { backgroundColor: colors.bed }]}>
      <Icon name="info" size={18} color={colors.accent} />
      <Text style={[type.subhead, styles.noteText, { color: colors.secondary }]}>
        No events match these filters. Try a wider date range.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  backButton: { width: 28 },
  headerTitle: { flex: 1 },
  scaffold: { paddingHorizontal: space.edge, paddingBottom: space.sm },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingBottom: space.sm,
  },
  rangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterRow: { paddingHorizontal: space.edge, paddingBottom: space.sm },
  entityRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.edge,
    paddingBottom: space.sm,
  },
  entityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: { paddingHorizontal: space.edge, paddingBottom: space.xxl, gap: space.md },
  railContent: { paddingHorizontal: space.edge, paddingBottom: space.xxl, gap: space.sm },
  dayHeader: { paddingVertical: space.sm },
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  still: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPill: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  cardText: { flex: 1, gap: space.xxs },
  categoryWell: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.edge,
  },
  noteText: { flex: 1 },
  alertPill: {
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  playerFrame: {
    marginHorizontal: space.edge,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.edge,
    paddingVertical: space.md,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  railStill: {
    width: 56,
    height: 42,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.edge,
    borderRadius: radius.sm,
    marginTop: space.edge,
  },
});
