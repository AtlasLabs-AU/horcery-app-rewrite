import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { snapshotPage, snapshotPageCount } from '@/components/for-you/snapshot-paging';
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
  /** Stall or horse name shown in the tile footer. */
  name: string;
  /** Still frame for the tile. */
  posterUri?: string;
  /** BlurHash shown while the poster loads. */
  blurhash?: string;
  /** Avatar image for the horse; initials are drawn when absent. */
  avatarUri?: string;
}

/**
 * Snapshots carousel.
 *
 * **The performance change lives here.** In the current app every tile mounts a
 * looping `expo-video` player streaming an HLS timelapse, so N tiles decode N
 * video streams at once — the single largest cost on the page. Here a tile is a
 * still image; the visual result is the same, the work is not.
 */
function columnsForWidth(width: number): number {
  if (width >= 1000) return 4;
  if (width >= 700) return 3;
  return 2;
}

export function SnapshotsCard({
  snapshots,
  playbackSpeedLabel = '10x',
  subtitle = 'Last 2 hours at a glance',
  activePage = 0,
}: {
  snapshots: Snapshot[];
  playbackSpeedLabel?: string;
  subtitle?: string;
  activePage?: number;
}) {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const columns = columnsForWidth(width);
  const pageCount = snapshotPageCount(snapshots.length, columns);
  const visible = snapshotPage(snapshots, columns, activePage);

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

      <View style={styles.tileRow}>
        {visible.map((snapshot) => (
          <SnapshotTile key={snapshot.id} snapshot={snapshot} />
        ))}
      </View>

      {/*
        The dots reflect real pages now that the row is paged rather than
        truncated (§6b finding 6). Changing page still needs a swipe gesture —
        that, foreground refresh and fullscreen belong to the Snapshots
        vertical slice, and `activePage` is controlled by the caller until then.
      */}
      {pageCount > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: pageCount }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === activePage ? colors.accent : colors.dimmed },
              ]}
            />
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

/**
 * A tile is now the shared `MediaTile` in its confirmed overlay treatment
 * (Inakshi, 2026-08-17): the name sits on the frame over a scrim rather than
 * on a grey strip beneath it.
 *
 * The horse avatar that used to sit in that strip is gone with it — a face
 * chip on top of a camera frame is one thing too many, and the frame already
 * shows the horse. Its `avatarUri` stays on the type for the fullscreen view
 * (H5), where there is room for it.
 */
function SnapshotTile({ snapshot }: { snapshot: Snapshot }) {
  return (
    <View style={styles.tile}>
      <MediaTile
        posterUri={snapshot.posterUri}
        blurhash={snapshot.blurhash}
        title={snapshot.name}
        accessibilityLabel={`${snapshot.name} snapshot`}
        testID={`for-you-snapshot-${snapshot.id}`}
        compact
      />
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
    fontWeight: '600',
  },
  subtitle: {
    marginTop: space.xxs,
  },
  tileRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.edge,
  },
  tile: { flex: 1 },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: space.sm,
    marginTop: space.edge,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
});
