import { router } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BehaviorTrackerCard } from '@/components/for-you/behavior-tracker-card';
import {
  Deferred,
  RevealProvider,
  useRevealSource,
} from '@/components/for-you/deferred';
import { ForYouHeader } from '@/components/for-you/header';
import { IntakeCard } from '@/components/for-you/intake-card';
import { OrganizationCard } from '@/components/for-you/organization-card';
import { ReviewCard } from '@/components/for-you/review-card';
import { SnapshotsCard } from '@/components/for-you/snapshots-card';
import { useAlertStatus } from '@/hooks/use-alert-status';
import { useForYouData } from '@/hooks/use-for-you-data';
import { useSnapshots } from '@/hooks/use-snapshots';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { space } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

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
  // Scroll geometry is published through a ref + subscription rather than
  // state: `Deferred` is its only consumer and each section reads it once.
  const { source, onScroll, onLayout } = useRevealSource();
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
  const alertStatus = useAlertStatus(organizationID);
  const { colors } = useTokens();

  const openMenu = useCallback(() => router.push('/menu'), []);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ForYouHeader onMenu={openMenu} />
        <RevealProvider source={source}>
        <ScrollView
          testID="for-you-scroll-view"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          scrollEventThrottle={64}
          onScroll={onScroll}
          onLayout={onLayout}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }>
          <OrganizationCard
            organizationName={organizationName}
            organizations={organizations}
            organizationID={organizationID}
            onSelectOrganization={selectOrganization}
            localTime={localTime}
            alertStatus={alertStatus}
          />

          <SnapshotsCard snapshots={snapshots} />

          <ReviewCard />

          <Deferred reserve={380}>
            <BehaviorTrackerCard />
          </Deferred>

          {devices.hasWaterDevices ? (
            <Deferred reserve={230}>
              <IntakeCard
                title="Water Intake"
                todayColor="#00B8DB"
                testID="for-you-water-intake"
              />
            </Deferred>
          ) : null}

          {devices.hasFeedDevices ? (
            <Deferred reserve={230}>
              <IntakeCard
                title="Feed Intake"
                todayColor="#F0B100"
                testID="for-you-feed-intake"
              />
            </Deferred>
          ) : null}
        </ScrollView>
        </RevealProvider>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    gap: space.edge,
    paddingBottom: BottomTabInset + space.xxl,
  },
});
