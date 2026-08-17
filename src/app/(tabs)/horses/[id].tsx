import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HorsesError, HorsesLoading } from '@/components/horses/horses-states';
import { MediaTile } from '@/components/media/media-tile';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { radius, space, type } from '@/constants/tokens';
import { queries } from '@/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { useTokens } from '@/hooks/use-tokens';
import { useToast } from '@/components/ui/toast';
import { horseSelectionKey, joinHorseRow, type HorseRow } from '@/hooks/horses-data';
import type { SegmentedOption } from '@/components/ui/segmented-control-types';

const TAB_SEGMENT_WIDTH_OFFSET = space.edge * 2;

type DetailTab = 'summary' | 'events' | 'alerts';

const TABS: SegmentedOption<DetailTab>[] = [
  { label: 'Summary', value: 'summary' },
  { label: 'Events', value: 'events' },
  { label: 'Alerts', value: 'alerts' },
];

function value(param: string | string[] | undefined, fallback = '') {
  return Array.isArray(param) ? (param[0] ?? fallback) : (param ?? fallback);
}

export default function HorseDetailSeed() {
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const organizationID = useAuthStore((state) => state.organizationID);
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [selectedDate, setSelectedDate] = useState(0);
  const { showToast } = useToast();
  const id = value(params.id);
  const isSampleHorse = id.startsWith('sample-');

  const horseQuery = useQuery({
    ...queries.animal.detail(id, {
      deleted_at__isnull: true,
      organization_id: organizationID ?? '',
    }),
    enabled: !!id && !isSampleHorse && !!organizationID,
    select: (response) => response.data,
  });

  const horse = useMemo(() => {
    // Read inside the memo, not during render: the compiler cannot prove a
    // value pulled out of the query cache will not be mutated afterwards, so
    // hoisting it out costs the whole component its memoization.
    const cached = queryClient.getQueryData<HorseRow>(horseSelectionKey(id));
    if (cached) return cached;
    if (!horseQuery.data) return null;

    const epoch =
      Math.floor(
        DateTime.now().minus({ minutes: 5 }).toSeconds() / 300,
      ) * 300;

    return joinHorseRow(horseQuery.data, horseQuery.data.stall, epoch);
  }, [queryClient, id, horseQuery.data]);

  const onTabChange = useCallback((value: DetailTab) => {
    setActiveTab(value);
  }, []);

  if (!horse && horseQuery.isLoading) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <Stack.Screen options={{ title: 'Horse', headerLargeTitle: false }} />
        <HorsesLoading />
      </ScrollView>
    );
  }

  if (!horse && horseQuery.isError) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Horse', headerLargeTitle: false }} />
        <HorsesError onRetry={() => void horseQuery.refetch()} />
      </View>
    );
  }

  if (!horse) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Horse', headerLargeTitle: false }} />
        <Text style={[type.title3, { color: colors.foreground }]}>Horse not found</Text>
      </View>
    );
  }

  const name = horse?.name ?? 'Horse';
  const stallName = horse?.stallName ?? 'No stall';
  const hasImage = !!horse?.imageUri || !!horse?.blurhash;
  const dates = ['Today', 'Yesterday', '2 days ago'];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: name, headerLargeTitle: false }} />

      <MediaTile
        posterUri={hasImage ? horse.imageUri : undefined}
        blurhash={horse.blurhash}
        showPlayBadge={hasImage}
        onPress={hasImage ? () => showToast('Playback is unavailable until a camera capability is authorised.') : undefined}
        accessibilityLabel={`${name} photo`}
        style={[styles.media, { backgroundColor: colors.fillTonal }]}
      />

      <View style={styles.titleRow}>
        <Text style={[type.largeTitle, { color: colors.foreground }]}>{name}</Text>
        <Text style={[type.headline, { color: colors.secondary }]}>{stallName}</Text>
      </View>

      <SegmentedControl<DetailTab>
        options={TABS}
        value={activeTab}
        onChange={onTabChange}
        width={Math.max(width - TAB_SEGMENT_WIDTH_OFFSET, 260)}
        accessibilityLabel="Horse tabs"
      />

      <View style={styles.dateRow} accessibilityLabel="Horse history dates">
        {dates.map((date, index) => (
          <Pressable
            key={date}
            onPress={() => setSelectedDate(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedDate === index }}
            accessibilityLabel={`Show ${date}`}
            style={[styles.dateButton, { backgroundColor: selectedDate === index ? colors.bed : colors.card, borderColor: colors.divider }]}>
            <Text style={[type.subhead, { color: colors.foreground, fontWeight: selectedDate === index ? '600' : '400' }]}>{date}</Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[styles.tabPanel, { backgroundColor: colors.card, borderColor: colors.divider }]}
      >
        {activeTab === 'summary' ? (
          <>
            <Text style={[type.title3, { color: colors.foreground }]}>Summary</Text>
            <View style={styles.statGrid}>
              {['In-stall status', 'Latest activity', 'Daily statistics'].map((label) => (
                <View key={label} style={[styles.stat, { backgroundColor: colors.bed }]}>
                  <Text style={[type.footnote, { color: colors.secondary }]}>{label}</Text>
                  <Text style={[type.headline, { color: colors.tertiary }]}>Unavailable</Text>
                </View>
              ))}
            </View>
            <Text style={[type.subhead, { color: colors.secondary, marginTop: space.xs }]}>Live status and metrics will appear here once the observation contract is connected.</Text>
            {isSampleHorse ? (
              <Text style={[type.footnote, { color: colors.accent, marginTop: space.sm }]}>Sample horse</Text>
            ) : null}
          </>
        ) : activeTab === 'events' ? (
          <>
            <Text style={[type.title3, { color: colors.foreground }]}>Events</Text>
            <Text style={[type.subhead, { color: colors.secondary, marginTop: space.xs }]}>No events are available for {dates[selectedDate].toLowerCase()}.</Text>
            <Pressable onPress={() => showToast('Event history is already up to date.')} accessibilityRole="button" accessibilityLabel="Refresh events" style={styles.textButton}><Text style={[type.headline, { color: colors.accent }]}>Refresh events</Text></Pressable>
          </>
        ) : (
          <>
            <Text style={[type.title3, { color: colors.foreground }]}>Alerts</Text>
            <Text style={[type.subhead, { color: colors.secondary, marginTop: space.xs }]}>No alerts are available for this horse on {dates[selectedDate].toLowerCase()}.</Text>
            <Pressable onPress={() => showToast('Alert history is already up to date.')} accessibilityRole="button" accessibilityLabel="Refresh alerts" style={styles.textButton}><Text style={[type.headline, { color: colors.accent }]}>Refresh alerts</Text></Pressable>
          </>
        )}
      </View>

      <View style={[styles.videoPanel, { backgroundColor: colors.card, borderColor: colors.divider }]}>
        <View style={styles.videoHeading}>
          <View style={styles.videoWords}>
            <Text style={[type.title3, { color: colors.foreground }]}>Camera history</Text>
            <Text style={[type.subhead, { color: colors.secondary }]}>Recorded clips and live playback</Text>
          </View>
          <Pressable onPress={() => showToast('Camera settings are not connected yet.')} accessibilityRole="button" accessibilityLabel="Open camera settings" style={styles.settingsButton}>
            <Text style={[type.headline, { color: colors.accent }]}>Settings</Text>
          </Pressable>
        </View>
        <Text style={[type.subhead, { color: colors.tertiary }]}>Playback is unavailable until this horse has an authorised camera capability.</Text>
        <View style={[styles.scrubber, { backgroundColor: colors.fillTonal }]}><View style={[styles.scrubberTrack, { backgroundColor: colors.divider }]} /><View style={[styles.scrubberThumb, { backgroundColor: colors.accent }]} /></View>
        <View style={styles.scrubberLabels}><Text style={[type.caption, { color: colors.tertiary }]}>00:00</Text><Text style={[type.caption, { color: colors.tertiary }]}>No clip selected</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.edge, paddingBottom: space.xxl, gap: space.md },
  media: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  titleRow: { gap: space.xs },
  tabPanel: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  dateRow: { flexDirection: 'row', gap: space.sm },
  dateButton: { minHeight: 44, flex: 1, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xs },
  statGrid: { gap: space.sm, marginTop: space.md },
  stat: { minHeight: 56, borderRadius: radius.sm, padding: space.sm, justifyContent: 'center', gap: space.xxs },
  textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: space.sm },
  videoPanel: { borderRadius: radius.md, borderCurve: 'continuous', borderWidth: 1, padding: space.md, gap: space.md },
  videoHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  videoWords: { flex: 1, gap: space.xs },
  settingsButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  scrubber: { height: 16, borderRadius: radius.full, justifyContent: 'center', paddingHorizontal: space.xs },
  scrubberTrack: { height: 4, borderRadius: radius.full, width: '100%' },
  scrubberThumb: { position: 'absolute', left: space.xs, width: 12, height: 12, borderRadius: radius.full },
  scrubberLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stateShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.edge,
  },
});
