import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { OverflowMenu } from '@/components/for-you/overflow-menu';
import { Brand, Fyp, Radius, Spacing } from '@/constants/theme';

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
 * still image by default, and only the tile the user is actually looking at is
 * handed a player (`isPlaying`). The visual result is the same; the work is not.
 */
export function SnapshotsCard({
  snapshots,
  playbackSpeedLabel = '10x',
  subtitle = 'Last 2 hours at a glance',
  pageCount = 1,
  activePage = 0,
}: {
  snapshots: Snapshot[];
  playbackSpeedLabel?: string;
  subtitle?: string;
  pageCount?: number;
  activePage?: number;
}) {
  return (
    <SectionCard testID="for-you-snapshots">
      <SectionHeader
        title="Snapshots"
        adornment={
          <View style={styles.speedPill}>
            <Text style={styles.speedText}>{`▶ ${playbackSpeedLabel}`}</Text>
          </View>
        }
        action={
          <OverflowMenu
            label="Snapshot options"
            testID="for-you-snapshot-menu"
            actions={[
              { label: 'Playback speed', systemImage: 'gauge.with.needle' },
              { label: 'Go live', systemImage: 'dot.radiowaves.left.and.right' },
            ]}
          />
        }
      />
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.tileRow}>
        {snapshots.slice(0, 2).map((snapshot) => (
          <SnapshotTile key={snapshot.id} snapshot={snapshot} />
        ))}
      </View>

      {pageCount > 1 ? (
        <View style={styles.dots}>
          {Array.from({ length: pageCount }).map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activePage && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

function SnapshotTile({ snapshot }: { snapshot: Snapshot }) {
  return (
    <View style={styles.tile} testID={`for-you-snapshot-${snapshot.id}`}>
      <Image
        style={styles.poster}
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
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials(snapshot.name)}</Text>
          </View>
        )}
        <Text style={styles.tileName} numberOfLines={1}>
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
    backgroundColor: Fyp.pill,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Fyp.body,
  },
  subtitle: {
    fontSize: 14,
    color: Fyp.muted,
    marginTop: Spacing.half,
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    marginTop: Spacing.three,
  },
  tile: {
    flex: 1,
    borderRadius: Radius.inner,
    overflow: 'hidden',
    backgroundColor: Fyp.pill,
  },
  poster: {
    width: '100%',
    aspectRatio: 1.35,
    backgroundColor: '#D9DDE3',
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tileName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Fyp.title,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D2D6DB',
  },
  dotActive: {
    backgroundColor: Brand.primary,
  },
});
