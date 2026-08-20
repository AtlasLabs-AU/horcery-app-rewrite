import { Stack } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { LyingDownRow } from '@/components/charts/lying-down-row';
import { MediaTile } from '@/components/media/media-tile';
import { SplitRow } from '@/components/ui/split-row';
import { PREVIEW_ZONE } from '@/config/constants/live-preview-monitors';
import { radius } from '@/constants/tokens';
import { useLiveMonitorWeeks, type LiveMonitorWeek } from '@/hooks/use-live-monitor-week';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Development-only view of three real monitor inputs through the same shared
 * Lying Down row used by For You. No production screen imports this route.
 */
export default function LiveMonitorPreviewScreen() {
  const { colors, type, space } = useTokens();
  const { width: screenWidth } = useWindowDimensions();
  const monitors = useLiveMonitorWeeks();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const chartWidth = Math.max(0, screenWidth - space.edge * 2 - space.card * 2);

  const refreshing = monitors.some((monitor) => monitor.isRefreshing);
  const onRefresh = useCallback(async () => {
    await Promise.all(monitors.map((monitor) => monitor.refetch()));
  }, [monitors]);

  const onTogglePlayback = useCallback((monitorId: string) => {
    setPlayingId((current) => (current === monitorId ? null : monitorId));
  }, []);

  const onPlaybackError = useCallback((monitorId: string) => {
    setPlayingId((current) => (current === monitorId ? null : current));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Live monitors', headerLargeTitle: true }} />
      <ScrollView
        style={[styles.page, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          { gap: space.lg, padding: space.edge, paddingBottom: space.xl },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}>
        <Text style={[type.subhead, { color: colors.secondary }]} selectable>
          Real monitor data, displayed through the shared Lying Down chart. This is a read-only development preview.
        </Text>

        {monitors.map((monitor) => (
          <LiveMonitorBlock
            key={monitor.monitor.id}
            monitor={monitor}
            chartWidth={chartWidth}
            playing={playingId === monitor.monitor.id}
            onTogglePlayback={onTogglePlayback}
            onPlaybackError={onPlaybackError}
          />
        ))}

        <Text style={[type.footnote, styles.footer, { color: colors.tertiary }]} selectable>
          Live production data · read-only preview · assumed {PREVIEW_ZONE}, 6 AM barn day
        </Text>
      </ScrollView>
    </>
  );
}

function LiveMonitorBlock({
  monitor,
  chartWidth,
  playing,
  onTogglePlayback,
  onPlaybackError,
}: {
  monitor: LiveMonitorWeek;
  chartWidth: number;
  playing: boolean;
  onTogglePlayback: (monitorId: string) => void;
  onPlaybackError: (monitorId: string) => void;
}) {
  const { colors, type, space } = useTokens();
  const [streamUnavailable, setStreamUnavailable] = useState(false);
  const title = monitor.monitor.label;
  const streamState = streamUnavailable ? 'Stream unavailable' : playing ? 'Live' : 'Paused';
  const streamColor = streamUnavailable
    ? colors.statusAlert
    : playing
      ? colors.statusOk
      : colors.tertiary;

  const retry = useCallback(() => {
    void monitor.refetch();
  }, [monitor]);

  const togglePlayback = useCallback(() => {
    setStreamUnavailable(false);
    onTogglePlayback(monitor.monitor.id);
  }, [monitor.monitor.id, onTogglePlayback]);

  const handlePlaybackError = useCallback(() => {
    setStreamUnavailable(true);
    onPlaybackError(monitor.monitor.id);
  }, [monitor.monitor.id, onPlaybackError]);

  const chart = useMemo(
    () => (
      <LyingDownRow
        horseName={title}
        week={monitor.week}
        verdict={monitor.verdict}
        averageSeconds={null}
        width={chartWidth}
      />
    ),
    [chartWidth, monitor.verdict, monitor.week, title],
  );

  return (
    <View
      style={[
        styles.monitor,
        {
          gap: space.md,
          padding: space.card,
          backgroundColor: colors.card,
          borderColor: colors.divider,
        },
      ]}>
      <SplitRow
        leading={<Text style={[type.title3, styles.monitorTitle, { color: colors.foreground }]}>{title}</Text>}
        trailing={<Text style={[type.footnote, { color: streamColor }]}>{streamState}</Text>}
      />

      <MediaTile
        title={title}
        subtitle={streamUnavailable ? 'Tap to try the live stream again' : 'Tap to play live video'}
        videoUri={playing ? monitor.monitor.videoManifestUrl : undefined}
        live={playing}
        muted
        showPlayBadge={!playing}
        onPress={togglePlayback}
        onPlaybackError={handlePlaybackError}
        accessibilityLabel={`${title} live video, ${streamState}. ${playing ? 'Tap to pause' : 'Tap to play'}.`}
        testID={`live-monitor-video-${monitor.monitor.id}`}
      />

      {chart}

      {monitor.isError ? (
        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel={`Retry ${title} chart data`}
          style={({ pressed }) => [styles.retry, pressed ? styles.pressed : undefined]}>
          <Text style={[type.subhead, { color: colors.accent }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: {},
  monitor: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  monitorTitle: { flexShrink: 1 },
  retry: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.65 },
  footer: { textAlign: 'center' },
});
