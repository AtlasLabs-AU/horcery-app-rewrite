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
  const [refreshing, setRefreshing] = useState(false);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  }, []);

  const onRefresh = useCallback(() => {
    // Placeholder until the query layer lands. The spinner is driven by real
    // fetch state then — unlike the current app, where the refresh indicator
    // never appears at all (its isRefreshing check can never be true).
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ForYouHeader />
        <ScrollView
          testID="for-you-scroll-view"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          scrollEventThrottle={64}
          onScroll={onScroll}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Brand.primary]}
              tintColor={Brand.primary}
            />
          }>
          <OrganizationCard
            organizationName="Mobile Dev Testing"
            localTime="10:29 am"
            temperature="83°F"
            humidity="85%"
            statusText="Everything looks normal"
            metricsWatched={31}
          />

          <SnapshotsCard
            snapshots={[
              { id: 'a', name: 'new horse 16 dec' },
              { id: 'b', name: 'Claire Murphy' },
            ]}
            pageCount={3}
            activePage={0}
          />

          <ReviewCard />

          <Deferred
            reserve={380}
            scrollY={scrollY}
            viewportHeight={viewportHeight}>
            <BehaviorTrackerCard />
          </Deferred>

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
