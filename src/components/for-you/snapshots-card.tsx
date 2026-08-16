import { Image } from 'expo-image';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { snapshotPage, snapshotPageCount } from '@/components/for-you/snapshot-paging';
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

function SnapshotTile({ snapshot }: { snapshot: Snapshot }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.tile, { backgroundColor: colors.bed }]} testID={`for-you-snapshot-${snapshot.id}`}>
      <Image
        style={[styles.poster, { backgroundColor: colors.fillTonal }]}
        source={snapshot.posterUri}
        placeholder={snapshot.blurhash ? { blurhash: snapshot.blurhash } : undefined}
        contentFit="cover"
        transition={150}
        accessible
        accessibilityLabel={`${snapshot.name} snapshot`}
      />
      <View style={styles.tileFooter}>
        {snapshot.avatarUri ? (
          <Image source={snapshot.avatarUri} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[type.caption, styles.avatarInitials, { color: colors.onAccent }]}>
              {initials(snapshot.name)}
            </Text>
          </View>
        )}
        <Text style={[type.subhead, styles.tileName, { color: colors.foreground }]} numberOfLines={1}>
          {snapshot.name}
        </Text>
      </View>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
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
  tile: {
    flex: 1,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '700',
  },
  tileName: {
    flex: 1,
    fontWeight: '600',
  },
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
