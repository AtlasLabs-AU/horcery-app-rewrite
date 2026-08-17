import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HorsesError, HorsesLoading } from '@/components/horses/horses-states';
import { MediaTile } from '@/components/media/media-tile';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { radius, space, type } from '@/constants/tokens';
import { queries } from '@/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { useTokens } from '@/hooks/use-tokens';
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: name, headerLargeTitle: false }} />

      <MediaTile
        posterUri={hasImage ? horse.imageUri : undefined}
        blurhash={horse.blurhash}
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

      <View style={[styles.tabPanel, { backgroundColor: colors.card }]}>
        {activeTab === 'summary' ? (
          <>
            <Text style={[type.title3, { color: colors.foreground }]}>Horse summary</Text>
            <Text style={[type.subhead, { color: colors.secondary, marginTop: space.xs }]}>
              This tab currently shows card-level information only. In the rewrite, this is where
              live in-stall / out-of-stall status, latest activity and quick metrics will live.
            </Text>
            {isSampleHorse ? (
              <Text style={[type.footnote, { color: colors.accent, marginTop: space.sm }]}>Sample horse</Text>
            ) : null}
          </>
        ) : activeTab === 'events' ? (
          <>
            <Text style={[type.title3, { color: colors.foreground }]}>Events</Text>
            <Text style={[type.subhead, { color: colors.secondary, marginTop: space.xs }]}>
              This tab is intentionally scaffolded while we wire live event pages and filters.
            </Text>
          </>
        ) : (
          <>
            <Text style={[type.title3, { color: colors.foreground }]}>Alerts</Text>
            <Text style={[type.subhead, { color: colors.secondary, marginTop: space.xs }]}>
              This tab is intentionally scaffolded. Alerts readout, threshold details, and action paths
              are still to be connected.
            </Text>
          </>
        )}
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
  },
  stateShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.edge,
  },
});
