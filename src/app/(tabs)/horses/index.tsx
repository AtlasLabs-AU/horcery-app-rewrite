import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  HorsesEmpty,
  HorsesError,
  HorsesLoading,
  HorsesNoInternet,
} from '@/components/horses/horses-states';
import { PREVIEWS } from '@/config/previews';
import { filterSampleHorses, SAMPLE_HORSE_GROUPS } from '@/config/sample/horses-sample';
import { space } from '@/constants/tokens';
import { useHorseGroups } from '@/hooks/use-horse-groups';
import { useHorses, type HorseRow } from '@/hooks/use-horses';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { horseSelectionKey } from '@/hooks/horses-data';
import { useTokens } from '@/hooks/use-tokens';
import { prefetchAnimalDetailPage } from '@/services/api/prefetch-utils';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sampleOrganization, setSampleOrganization] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isNavigatingRef = useRef(false);
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(!isOnline);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

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
  const isOffline = !usingSample && !isOnline;
  const showSkeleton = loading && rows.length === 0 && !isOffline;
  const onGroupSelect = useCallback((groupId: string) => setSelectedGroup(groupId), []);
  const selectedNoInternet = isOffline && (error || rows.length === 0);
  const listHeader = error || selectedNoInternet ? null : (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      {usingSample ? <HorsesPreviewBanner /> : null}
      <GroupChips groups={groups} selectedId={selectedGroup} onSelect={onGroupSelect} isLoading={!usingSample && groupsQuery.isLoading} />
    </View>
  );

  const retry = useCallback(() => {
    if (isOffline) return;
    void Promise.all([horses.refetch(), groupsQuery.refetch()]);
  }, [isOffline, horses, groupsQuery]);

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
      void retry();
    }
  }, [isOnline, usingSample, retry]);

  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
      return () => {
        isNavigatingRef.current = false;
      };
    }, []),
  );

  const onSearchTextChange = useCallback(
    (event: { nativeEvent: { text: string } }) => {
      const value = event.nativeEvent.text;
      const nextValue = value.trim();
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      if (!value) {
        setDebouncedSearch('');
        return;
      }

      searchDebounceRef.current = setTimeout(() => {
        setDebouncedSearch(nextValue);
        searchDebounceRef.current = null;
      }, SEARCH_DELAY_MS);
    },
    [],
  );

  const onSearchCancel = useCallback(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setDebouncedSearch('');
  }, []);

  const refresh = async () => {
    if (!isOnline) return;
    setIsRefreshing(true);
    try {
      await Promise.all([horses.refresh(), groupsQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const openHorse = useCallback((horse: HorseRow) => {
    if (isNavigatingRef.current) {
      return;
    }

    isNavigatingRef.current = true;
    queryClient.setQueryData(horseSelectionKey(horse.id), horse);

    if (organizationID && !horse.id.startsWith('sample-')) {
      void prefetchAnimalDetailPage(horse.id, { organizationID }).catch(() => {
        // Keep route push responsive if prefetch fails.
      });
    }

    void (async () => {
      try {
        await router.push({
          pathname: '/horses/[id]',
          params: { id: horse.id },
        });
      } catch {
        isNavigatingRef.current = false;
      }
    })();
  }, [organizationID, queryClient]);

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
            onChangeText: onSearchTextChange,
            onCancelButtonPress: onSearchCancel,
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
        ListHeaderComponent={listHeader}
        stickyHeaderIndices={error || selectedNoInternet ? undefined : [0]}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <HorseCard horse={item} onPress={() => openHorse(item)} />
          </View>
        )}
        ListEmptyComponent={
          showSkeleton ? (
            <HorsesLoading />
          ) : selectedNoInternet ? (
            <HorsesNoInternet onRetry={retry} enabled={isOnline} />
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
