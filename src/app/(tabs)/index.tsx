import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BehaviorTrackerCard } from '@/components/for-you/behavior-tracker-card';
import { Deferred } from '@/components/for-you/deferred';
import { ForYouHeader } from '@/components/for-you/header';
import { IntakeCard } from '@/components/for-you/intake-card';
import { OrganizationCard } from '@/components/for-you/organization-card';
import { ReviewCard } from '@/components/for-you/review-card';
import { SnapshotsCard } from '@/components/for-you/snapshots-card';
import { useForYouData } from '@/hooks/use-for-you-data';
import { useSnapshots } from '@/hooks/use-snapshots';
import { Brand, BottomTabInset, Fyp, MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * For You — the screen customers land on.
 *
 * Layout is a deliberate match for the current app. What differs is underneath:
 * native controls instead of hand-drawn ones, still images instead of a video
 * player per snapshot tile, and sections below the fold that mount as you reach
 * them rather than all at once.
 *
 * Data wiring lands in the next commit; the sections take props so that step is
 * a change of source, not of structure.
 */
export default function ForYouScreen() {
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const {
    organizationID,
    organizationName,
    localTime,
    devices,
    organizations,
    selectOrganization,
    isRefreshing,
    refresh,
  } = useForYouData();
  const { snapshots } = useSnapshots();

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  }, []);

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ForYouHeader onMenu={() => router.push('/menu')} />
        <ScrollView
          testID="for-you-scroll-view"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          scrollEventThrottle={64}
          onScroll={onScroll}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[Brand.primary]}
              tintColor={Brand.primary}
            />
          }>
          <OrganizationCard
            organizationName={organizationName}
            organizations={organizations}
            organizationID={organizationID}
            onSelectOrganization={selectOrganization}
            localTime={localTime}
            statusText="Everything looks normal"
          />

          <SnapshotsCard
            snapshots={snapshots}
            pageCount={Math.max(1, Math.ceil(snapshots.length / 2))}
            activePage={0}
          />

          <ReviewCard />

          <Deferred
            reserve={380}
            scrollY={scrollY}
            viewportHeight={viewportHeight}>
            <BehaviorTrackerCard />
          </Deferred>

          {devices.hasWaterDevices ? (
            <Deferred
              reserve={230}
              scrollY={scrollY}
              viewportHeight={viewportHeight}>
              <IntakeCard
                title="Water Intake"
                todayColor="#00B8DB"
                testID="for-you-water-intake"
              />
            </Deferred>
          ) : null}

          {devices.hasFeedDevices ? (
            <Deferred
              reserve={230}
              scrollY={scrollY}
              viewportHeight={viewportHeight}>
              <IntakeCard
                title="Feed Intake"
                todayColor="#F0B100"
                testID="for-you-feed-intake"
              />
            </Deferred>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Fyp.pageBackground,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
});
