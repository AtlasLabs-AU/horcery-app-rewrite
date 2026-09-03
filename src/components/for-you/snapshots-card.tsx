import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
import { MediaCarousel } from '@/components/media/media-carousel';
import { MediaTile } from '@/components/media/media-tile';
import { Icon } from '@/components/ui/icon';
import { Menu } from '@/components/ui/menu';
import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export interface Snapshot {
  id: string;
  /** Stall or horse name, captioned on the frame. */
  name: string;
  /** Still frame for the tile. */
  posterUri?: string;
  /** Live HLS manifest, when this stall has a monitor to stream from. */
  liveUri?: string;
  /** Whether the stall streams barn audio at all. */
  hasAudio?: boolean;
  /** BlurHash shown while the poster loads. */
  blurhash?: string;
  /** Horse avatar — kept for the fullscreen view (H5), not drawn on the tile. */
  avatarUri?: string;
}

/**
 * Snapshots carousel.
 *
 * **The performance change lives here.** In the current app every tile mounts a
 * looping `expo-video` player streaming an HLS timelapse, so N tiles decode N
 * video streams at once — the single largest cost on the page. Here a tile is a
 * still image; the visual result is the same, the work is not.
 *
 * **Sizing (Inakshi, 2026-08-17):** a swipeable row of full-size tiles rather
 * than two small ones side by side. The two-up grid could only give each tile
 * 178pt inside a doubly-inset card; the carousel measures the screen and gets
 * 273pt, with the next tile peeking as the swipe affordance.
 */
export function SnapshotsCard({
  snapshots,
  playbackSpeedLabel = '10x',
  subtitle = 'Last 2 hours at a glance',
  paused = false,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  snapshots: Snapshot[];
  playbackSpeedLabel?: string;
  subtitle?: string;
  /**
   * Stop streaming — the screen sets this when the tab loses focus.
   *
   * Owned by the SCREEN rather than read from navigation here, so the card
   * stays a presentational component that renders without a navigator (and
   * stays testable in isolation, like every other For You card).
   */
  paused?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const { colors } = useTokens();
  const [wantsLive, setWantsLive] = useState(false);
  const [muted, setMuted] = useState(true);
  /** Stalls whose stream failed this session — they fall back to the still. */
  const [failed, setFailed] = useState<string[]>([]);

  const streamable = snapshots.some((snapshot) => !!snapshot.liveUri);
  /**
   * Derived, not stored. An organisation with no monitor can never be live,
   * and a paused card must not stream — so both are folded in here rather
   * than "corrected" by an effect afterwards.
   *
   * `paused` matters more than it looks: the current app's players keep
   * decoding after you navigate away, because its release code is commented
   * out and its visibility flag is unused.
   */
  const live = wantsLive && streamable && !paused;

  // A stream that failed once should not retry forever on every re-render;
  // reset only when the user deliberately goes live again.
  const onGoLive = useCallback(() => {
    setFailed([]);
    setWantsLive((current) => !current);
  }, []);

  const onFailed = useCallback((id: string) => {
    setFailed((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  return (
    <SectionCard testID="for-you-snapshots">
      <SectionHeader
        title="Snapshots"
        adornment={
          <View style={[styles.speedPill, { backgroundColor: colors.fillTonal }]}>
            <Text style={[type.caption, styles.speedText, { color: colors.accent }]}>
              {live ? 'LIVE' : `▶ ${playbackSpeedLabel}`}
            </Text>
          </View>
        }
        action={
          <Menu
            icon="overflow"
            accessibilityLabel="Snapshot options"
            testID="for-you-snapshot-menu"
            actions={[
              {
                id: 'go-live',
                label: live ? 'Stop live' : 'Go live',
                description: streamable
                  ? live
                    ? 'Back to the still frames.'
                    : 'Stream the camera you are looking at.'
                  : 'No stall monitor in this organisation to stream from.',
                icon: 'spaces',
                disabled: !streamable,
                onPress: streamable ? onGoLive : undefined,
              },
              {
                id: 'mute',
                label: muted ? 'Unmute' : 'Mute',
                description: live
                  ? 'Barn audio, when the stall streams it.'
                  : 'Available while the camera is live.',
                icon: muted ? 'soundOff' : 'sound',
                disabled: !live,
                onPress: live ? () => setMuted((current) => !current) : undefined,
              },
            ]}
          />
        }
      />
      <Text style={[type.subhead, styles.subtitle, { color: colors.tertiary }]}>
        {live ? 'Live from the stall you are viewing' : subtitle}
      </Text>

      {snapshots.length ? (
        <MediaCarousel
          items={snapshots}
          keyExtractor={(snapshot) => snapshot.id}
          testID="for-you-snapshot-row"
          renderItem={(snapshot, _index, isSnapped) => {
          const broken = failed.includes(snapshot.id);
          /**
           * ONE player, ever. `videoUri` is passed only to the snapped tile
           * while live — supplying it to every tile would construct a player
           * per tile even though only one plays, which is the exact cost this
           * carousel replaced.
           */
          const playing = live && isSnapped && !!snapshot.liveUri && !broken;
          /**
           * Live is on, but THIS stall has no stream to give. Without a word
           * the header says LIVE while the tile sits there as a still and the
           * reader is left to guess whether it is loading, broken, or simply
           * a quiet stall.
           */
          const cannotStream = live && !snapshot.liveUri;

          return (
            <MediaTile
              posterUri={snapshot.posterUri}
              blurhash={snapshot.blurhash}
              videoUri={playing ? snapshot.liveUri : undefined}
              live={playing}
              muted={muted || !snapshot.hasAudio}
              onPlaybackError={() => onFailed(snapshot.id)}
              title={snapshot.name}
              tag={
                broken
                  ? { label: 'Live unavailable' }
                  : cannotStream
                    ? { label: 'No live stream' }
                    : playing
                      ? { label: 'LIVE', tone: 'alert' }
                      : undefined
              }
              accessibilityLabel={`${snapshot.name} ${playing ? 'live camera' : 'snapshot'}`}
              testID={`for-you-snapshot-${snapshot.id}`}
            />
          );
          }}
        />
      ) : isLoading ? (
        <SnapshotState testID="for-you-snapshots-loading" icon="camera" text="Loading snapshots…" loading />
      ) : isError ? (
        <SnapshotState
          testID="for-you-snapshots-error"
          icon="cameraOff"
          text="Couldn’t load snapshots."
          action={onRetry ? <LinkButton label="Try again" onPress={onRetry} testID="for-you-snapshots-retry" /> : undefined}
        />
      ) : (
        <SnapshotState
          testID="for-you-snapshots-empty"
          icon="cameraOff"
          text="No monitored stalls yet. Snapshots appear after a Stall Monitor is connected."
        />
      )}
    </SectionCard>
  );
}

function SnapshotState({
  testID,
  icon,
  text,
  loading = false,
  action,
}: {
  testID: string;
  icon: 'camera' | 'cameraOff';
  text: string;
  loading?: boolean;
  action?: React.ReactNode;
}) {
  const { colors } = useTokens();
  return (
    <View style={[styles.state, { backgroundColor: colors.bed }]} testID={testID}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Icon name={icon} size={18} color={colors.accent} />
      )}
      <Text style={[type.subhead, styles.stateText, { color: colors.secondary }]}>{text}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  speedPill: {
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  speedText: {
    fontFamily: font.semibold,
  },
  subtitle: {
    marginTop: space.xxs,
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: space.edge,
    marginTop: space.edge,
  },
  stateText: {
    flex: 1,
    lineHeight: 21,
  },
});
