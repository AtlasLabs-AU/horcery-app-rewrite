import { StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { MediaCarousel } from '@/components/media/media-carousel';
import { MediaTile } from '@/components/media/media-tile';
import { Menu } from '@/components/ui/menu';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Snapshot menu actions. Declared here, without handlers, because the
 * destinations do not exist yet — see the note on `Menu` below.
 */
const SNAPSHOT_MENU_ACTIONS = [
  { id: 'playback-speed', label: 'Playback speed', disabled: true },
  { id: 'go-live', label: 'Go live', disabled: true },
];

export interface Snapshot {
  id: string;
  /** Stall or horse name, captioned on the frame. */
  name: string;
  /** Still frame for the tile. */
  posterUri?: string;
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
}: {
  snapshots: Snapshot[];
  playbackSpeedLabel?: string;
  subtitle?: string;
}) {
  const { colors } = useTokens();

  return (
    <SectionCard testID="for-you-snapshots">
      <SectionHeader
        title="Snapshots"
        adornment={
          <View style={[styles.speedPill, { backgroundColor: colors.fillTonal }]}>
            <Text style={[type.caption, styles.speedText, { color: colors.accent }]}>
              {`▶ ${playbackSpeedLabel}`}
            </Text>
          </View>
        }
        action={
          <Menu
            icon="overflow"
            accessibilityLabel="Snapshot options"
            testID="for-you-snapshot-menu"
            actions={SNAPSHOT_MENU_ACTIONS}
          />
        }
      />
      <Text style={[type.subhead, styles.subtitle, { color: colors.tertiary }]}>{subtitle}</Text>

      <MediaCarousel
        items={snapshots}
        keyExtractor={(snapshot) => snapshot.id}
        testID="for-you-snapshot-row"
        renderItem={(snapshot) => (
          <MediaTile
            posterUri={snapshot.posterUri}
            blurhash={snapshot.blurhash}
            title={snapshot.name}
            accessibilityLabel={`${snapshot.name} snapshot`}
            testID={`for-you-snapshot-${snapshot.id}`}
          />
        )}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  speedPill: {
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  speedText: {
    fontWeight: '600',
  },
  subtitle: {
    marginTop: space.xxs,
  },
});
