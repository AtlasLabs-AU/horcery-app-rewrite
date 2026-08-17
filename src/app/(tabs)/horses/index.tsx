import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { GroupChips, ALL_HORSES } from '@/components/horses/group-chips';
import { HorseCard } from '@/components/horses/horse-card';
import { HorsesPreviewBanner } from '@/components/horses/horses-preview-banner';
import { HorsesEmpty, HorsesError, HorsesLoading } from '@/components/horses/horses-states';
import { PREVIEWS } from '@/config/previews';
import { filterSampleHorses, SAMPLE_HORSE_GROUPS } from '@/config/sample/horses-sample';
import { space } from '@/constants/tokens';
import { useHorseGroups } from '@/hooks/use-horse-groups';
import { useHorses, type HorseRow } from '@/hooks/use-horses';
import { horseSelectionKey } from '@/hooks/horses-data';
import { useTokens } from '@/hooks/use-tokens';
import { useAuthStore } from '@acme/stores/authorization-states';

const SEARCH_DELAY_MS = 300;

export default function HorsesScreen() {
  const organizationID = useAuthStore((state) => state.organizationID);
  return <HorsesContent key={organizationID ?? 'no-organization'} organizationID={organizationID} />;
}

function HorsesContent({ organizationID }: { organizationID: string | null }) {
  const { colors } = useTokens();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [selectedGroup, setSelectedGroup] = useState(ALL_HORSES);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sampleOrganization, setSampleOrganization] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const groupId = selectedGroup === ALL_HORSES ? undefined : selectedGroup;
  const horses = useHorses({ groupId, search: debouncedSearch || undefined });
  const groupsQuery = useHorseGroups();

  // Sample mode is decided only from the organization's unfiltered result.
  // A real group/search with zero matches must keep its honest empty state.
  useEffect(() => {
    if (
      PREVIEWS.sampleHorsesData &&
      organizationID &&
      selectedGroup === ALL_HORSES &&
      !debouncedSearch &&
      !horses.isLoading &&
      !horses.isError
    ) {
      const timer = setTimeout(
        () => setSampleOrganization(horses.rows.length === 0 ? organizationID : null),
        0,
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    organizationID,
    selectedGroup,
    debouncedSearch,
    horses.isLoading,
    horses.isError,
    horses.rows.length,
  ]);

  const usingSample = !!organizationID && sampleOrganization === organizationID;
  const groups = usingSample ? SAMPLE_HORSE_GROUPS : groupsQuery.groups;
  const rows = useMemo(
    () =>
      usingSample
        ? filterSampleHorses(groupId, debouncedSearch || undefined)
        : horses.rows,
    [usingSample, groupId, debouncedSearch, horses.rows],
  );
  const columns = width >= 1000 ? 3 : width >= 700 ? 2 : 1;
  const selectedGroupName = groups.find((group) => group.id === selectedGroup)?.name;
  const loading = !usingSample && (horses.isLoading || groupsQuery.isLoading);
  const error = !usingSample && (horses.isError || groupsQuery.isError);
  const showSkeleton = loading && rows.length === 0;

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([horses.refresh(), groupsQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openHorse = (horse: HorseRow) => {
    queryClient.setQueryData(horseSelectionKey(horse.id), horse);
    router.push({
      pathname: '/horses/[id]',
      params: { id: horse.id },
    });
  };

  const retry = () => {
    void Promise.all([horses.refetch(), groupsQuery.refetch()]);
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Horses',
          headerLargeTitle: true,
          headerTransparent: true,
          headerSearchBarOptions: {
            placeholder: 'Search horses',
            hideWhenScrolling: false,
            // A horse name is not a sentence: without this iOS sends "Zzzz"
            // for what was typed as "zzzz".
            autoCapitalize: 'none',
            onChangeText: (event) => setSearchText(event.nativeEvent.text),
            onCancelButtonPress: () => setSearchText(''),
          },
        }}
      />

      <FlashList
        key={`horses-${columns}`}
        data={rows}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />
        }
        ListHeaderComponent={
          error
            ? null
            : (
                <View style={[styles.header, { backgroundColor: colors.background }]}>
                  {usingSample ? <HorsesPreviewBanner /> : null}
                  <GroupChips
                    groups={groups}
                    selectedId={selectedGroup}
                    onSelect={setSelectedGroup}
                  />
                </View>
              )
        }
        stickyHeaderIndices={error ? undefined : [0]}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <HorseCard horse={item} onPress={() => openHorse(item)} />
          </View>
        )}
        ListEmptyComponent={
          showSkeleton ? (
            <HorsesLoading />
          ) : error ? (
            <HorsesError onRetry={retry} />
          ) : (
            <HorsesEmpty search={debouncedSearch || undefined} groupName={selectedGroupName} />
          )
        }
        ListFooterComponent={
          horses.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.accent} />
          ) : null
        }
        onEndReached={() => {
          if (!usingSample && horses.hasNextPage && !horses.isFetchingNextPage) {
            void horses.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  listContent: { paddingBottom: space.xxl },
  header: { paddingTop: space.sm, paddingBottom: space.md },
  cell: { flex: 1, paddingHorizontal: space.sm, paddingBottom: space.md },
  footer: { paddingVertical: space.lg },
});
