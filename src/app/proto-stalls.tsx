import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentedControl } from '@/components/ui/segmented-control';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * PROTOTYPE — Stalls page layout options.
 *
 * Requirements from Inakshi (2026-08-14): the page's job is "here are my
 * cameras" — video-first; each card carries ONLY the stall name and the
 * horse's name; streams play only while their card is on screen.
 *
 * Three layouts to choose between, flipped by the top switcher:
 * - Full:    one column of cinematic 3:2 cards, names on a scrim.
 * - Grid:    two columns, more cameras per glance, compact overlay.
 * - Caption: video left completely clean; names sit below the frame.
 *
 * Sample data + test videos stand in for real stalls/streams — judging
 * layout, not plumbing.
 */

const VIDEO_URIS = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
];

const STALLS = [
  { id: 's1', stall: 'Stall 1', horse: 'Storm', group: 'Barn A' },
  { id: 's2', stall: 'Stall 2', horse: 'Golden Boy', group: 'Barn B' },
  { id: 's3', stall: 'Stall 3', horse: 'Biscuit', group: 'Barn B' },
  { id: 's4', stall: 'Stall 4', horse: 'Claire Murphy', group: 'Barn A' },
  { id: 's5', stall: 'Stall 5', horse: 'Willow', group: 'Barn A' },
  { id: 's6', stall: 'Stall 6', horse: 'Juniper', group: 'Barn B' },
].map((item, i) => ({ ...item, uri: VIDEO_URIS[i % VIDEO_URIS.length] }));

const GROUPS = ['All Stalls', 'Barn A', 'Barn B'];

type Variant = 'full' | 'grid' | 'caption';
const VARIANTS: { label: string; value: Variant }[] = [
  { label: 'Full', value: 'full' },
  { label: 'Grid', value: 'grid' },
  { label: 'Caption', value: 'caption' },
];

export default function ProtoStallsScreen() {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const [variant, setVariant] = useState<Variant>('full');
  const [group, setGroup] = useState('All Stalls');
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    () => new Set(STALLS.slice(0, 2).map((s) => s.id)),
  );

  const stalls =
    group === 'All Stalls' ? STALLS : STALLS.filter((s) => s.group === group);

  // FlatList wants a stable identity for this callback; useCallback with no
  // deps gives one without reading a ref during render.
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisibleIds(new Set(viewableItems.map((v) => String(v.key))));
    },
    [],
  );

  const isGrid = variant === 'grid';
  const cardWidth = isGrid
    ? (width - space.edge * 2 - space.sm) / 2
    : width - space.edge * 2;

  const renderItem = useCallback(
    ({ item }: { item: (typeof STALLS)[number] }) => (
      <StallCard
        item={item}
        variant={variant}
        width={cardWidth}
        live={visibleIds.has(item.id)}
      />
    ),
    [variant, cardWidth, visibleIds],
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backButton}>
            <SymbolView
              name="chevron.left"
              size={20}
              tintColor={colors.foreground}
              weight="semibold"
            />
          </Pressable>
          <Text style={[type.largeTitle, styles.headerTitle, { color: colors.foreground }]}>
            Stalls
          </Text>
        </View>

        {/* Prototype scaffolding: layout switcher. */}
        <SegmentedControl
            options={VARIANTS}
            value={variant}
            onChange={setVariant}
            width={width - space.edge * 2}
          />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillRow}>
          {GROUPS.map((label) => {
            const selected = label === group;
            return (
              <Pressable
                key={label}
                onPress={() => setGroup(label)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.pill,
                  {
                    backgroundColor: selected ? colors.inverse : colors.card,
                    borderColor: colors.divider,
                  },
                ]}>
                <Text
                  style={[
                    type.subhead,
                    { color: selected ? colors.onInverse : colors.secondary },
                  ]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlatList
          key={`${variant}-${group}`}
          data={stalls}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={isGrid ? 2 : 1}
          columnWrapperStyle={isGrid ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        />
      </SafeAreaView>
    </View>
  );
}

function StallCard({
  item,
  variant,
  width,
  live,
}: {
  item: (typeof STALLS)[number];
  variant: Variant;
  width: number;
  live: boolean;
}) {
  const { colors } = useTokens();
  const player = useVideoPlayer(item.uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (live) player.play();
    else player.pause();
  }, [live, player]);

  // 4:3, per Inakshi — same ratio at every size.
  const height = (width * 3) / 4;
  const overlaid = variant !== 'caption';

  return (
    <View style={{ width }}>
      <View style={[styles.frame, { height, backgroundColor: colors.fillTonal }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
        {overlaid ? (
          <>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={styles.scrim}
            />
            <View style={styles.overlayText}>
              <Text
                style={[
                  variant === 'grid' ? type.subhead : type.headline,
                  styles.overlayName,
                ]}
                numberOfLines={1}>
                {item.stall}
              </Text>
              <View style={styles.horseRow}>
                <SymbolView
                  name="figure.equestrian.sports"
                  size={variant === 'grid' ? 11 : 13}
                  tintColor="rgba(255,255,255,0.85)"
                />
                <Text style={[type.footnote, styles.overlayHorse]} numberOfLines={1}>
                  {item.horse}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
      {overlaid ? null : (
        <View style={styles.captionBlock}>
          <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
            {item.stall}
          </Text>
          <Text style={[type.subhead, { color: colors.secondary }]} numberOfLines={1}>
            {item.horse}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  backButton: {
    width: 28,
  },
  headerTitle: {
    flex: 1,
  },
  switcher: {
    height: 28,
    marginHorizontal: space.edge,
  },
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.edge,
    paddingVertical: space.md,
  },
  pill: {
    minHeight: 36,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.edge,
  },
  listContent: {
    paddingHorizontal: space.edge,
    paddingBottom: space.xxl,
    gap: space.md,
  },
  gridRow: {
    gap: space.sm,
  },
  frame: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  overlayText: {
    position: 'absolute',
    left: space.edge,
    right: space.edge,
    bottom: space.md,
    gap: space.xxs,
  },
  overlayName: {
    color: '#FFFFFF',
  },
  horseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  overlayHorse: {
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 1,
  },
  captionBlock: {
    paddingHorizontal: space.xs,
    paddingTop: space.sm,
    gap: space.xxs,
  },
});
