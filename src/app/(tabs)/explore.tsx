import { Host } from '@expo/ui';
import { Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fyp, Spacing } from '@/constants/theme';

/**
 * PROTOTYPES — snapshot video carousel.
 *
 * Layout per Inakshi's direction:
 * - TOP ROW: an All/Behavior/People/Alert segmented filter, then a video
 *   carousel sized so ~1.6 cards are visible — the partial next card is the
 *   scroll affordance.
 * - SECOND ROW: smaller cards, ~2.5 visible, so a static glance at the page
 *   reads as "multiple rows, all swipeable".
 *
 * The Overlay/Caption/Glass switcher at the very top is prototype scaffolding
 * (it flips the text treatment on the top row), not part of the design.
 *
 * Component budget: snap ScrollView, expo-video, expo-linear-gradient,
 * expo-glass-effect, @expo/ui segmented Pickers. Nothing else.
 */

const RADIUS = 18;
const PAGE_MARGIN = Spacing.three;

// Verified reachable (curl 200) 2026-08-13 — Google's classic sample bucket
// now returns 403.
const VIDEO_URIS = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
];

type Category = 'behavior' | 'people' | 'alert';

const ITEMS = [
  { name: 'Claire Murphy', meta: 'Stall 4 · Barn A', category: 'behavior' },
  { name: 'Midnight', meta: 'Stall 7 · Barn A', category: 'people' },
  { name: 'Golden Boy', meta: 'Stall 2 · Barn B', category: 'alert' },
  { name: 'Storm', meta: 'Stall 1 · Barn A', category: 'behavior' },
  { name: 'Biscuit', meta: 'Stall 3 · Barn B', category: 'alert' },
].map((item, i) => ({
  ...item,
  category: item.category as Category,
  uri: VIDEO_URIS[i % VIDEO_URIS.length],
}));

const RAIL_ITEMS = [
  { name: 'Storm', meta: 'Stall 1' },
  { name: 'Biscuit', meta: 'Stall 3' },
  { name: 'Willow', meta: 'Stall 5' },
  { name: 'Juniper', meta: 'Stall 6' },
  { name: 'Comet', meta: 'Stall 8' },
  { name: 'Clover', meta: 'Stall 9' },
].map((item, i) => ({ ...item, uri: VIDEO_URIS[i % VIDEO_URIS.length] }));

type Filter = 'all' | Category;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Behavior', value: 'behavior' },
  { label: 'People', value: 'people' },
  { label: 'Alert', value: 'alert' },
];

type Variant = 'overlay' | 'caption' | 'glass';

const VARIANTS: { label: string; value: Variant }[] = [
  { label: 'Overlay', value: 'overlay' },
  { label: 'Caption', value: 'caption' },
  { label: 'Glass', value: 'glass' },
];

export default function CarouselPrototypes() {
  const [variant, setVariant] = useState<Variant>('overlay');
  const [filter, setFilter] = useState<Filter>('all');
  const { width } = useWindowDimensions();

  const items =
    filter === 'all' ? ITEMS : ITEMS.filter((i) => i.category === filter);

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text
          style={styles.stallsLink}
          onPress={() => router.push('/proto-stalls')}
          accessibilityRole="button"
          testID="proto-stalls-link">
          Stalls page options →
        </Text>
        <Text
          style={styles.stallsLink}
          onPress={() => router.push('/proto-history')}
          accessibilityRole="button"
          testID="proto-history-link">
          Review History options →
        </Text>
        <Text style={styles.title}>Snapshot carousel</Text>
        <Text style={styles.subtitle}>Prototype — text style: {variant}</Text>

        {/* Prototype scaffolding: flips the top row's text treatment. */}
        <Host style={styles.variantPicker}>
          <Picker
            selection={variant}
            onSelectionChange={(v) => setVariant(v as Variant)}
            modifiers={[
              pickerStyle('segmented'),
              frame({ width: width - PAGE_MARGIN * 2, height: 28 }),
            ]}>
            {VARIANTS.map((v) => (
              <SwiftUIText key={v.value} modifiers={[tag(v.value)]}>
                {v.label}
              </SwiftUIText>
            ))}
          </Picker>
        </Host>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ——— TOP ROW: filter + 1.6-cards-visible carousel ——— */}
          <Text style={styles.sectionTitle}>Events</Text>
          <Host style={styles.filterPicker}>
            <Picker
              selection={filter}
              onSelectionChange={(v) => setFilter(v as Filter)}
              modifiers={[
                pickerStyle('segmented'),
                frame({ width: width - PAGE_MARGIN * 2, height: 32 }),
              ]}>
              {FILTERS.map((f) => (
                <SwiftUIText key={f.value} modifiers={[tag(f.value)]}>
                  {f.label}
                </SwiftUIText>
              ))}
            </Picker>
          </Host>

          <Carousel
            key={`${variant}-${filter}`}
            items={items}
            variant={variant}
            viewportWidth={width}
          />

          {/* ——— SECOND ROW: smaller, 2.5 visible ——— */}
          <SmallRail viewportWidth={width} />
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * Top carousel. Cards at 62% of the viewport: one full card plus ~60% of the
 * next — squarely in the "1.5 to 2 visible" band, so the swipe explains
 * itself without dots doing the work.
 */
function Carousel({
  items,
  variant,
  viewportWidth,
}: {
  items: typeof ITEMS;
  variant: Variant;
  viewportWidth: number;
}) {
  const [page, setPage] = useState(0);

  const gap = Spacing.two + 2;
  const cardWidth = Math.round(viewportWidth * 0.62);
  const cardHeight = Math.round((cardWidth * 3) / 4); // 4:3
  const interval = cardWidth + gap;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: PAGE_MARGIN }}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / interval))
        }>
        {items.map((item, index) => (
          <View
            key={item.name}
            style={{
              width: cardWidth,
              marginRight: index === items.length - 1 ? 0 : gap,
            }}>
            <VideoCard
              item={item}
              variant={variant}
              width={cardWidth}
              height={cardHeight}
              active={index === page}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === page && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function VideoCard({
  item,
  variant,
  width,
  height,
  active,
}: {
  item: (typeof ITEMS)[number];
  variant: Variant;
  width: number;
  height: number;
  active: boolean;
}) {
  const player = useVideoPlayer(item.uri, (p) => {
    p.muted = true;
    p.loop = true;
  });

  /**
   * Only the snapped card plays; neighbours hold their frame.
   *
   * This has to be an effect. Starting playback in the setup callback and
   * correcting it here during render meant the correction was gated on
   * `player.playing`, which is still false while playback is starting — so on
   * first mount nothing paused and every card decoded at once. Render is also
   * the wrong place to drive a player: React may run it twice or throw the
   * result away.
   */
  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <View style={{ width }}>
      <View style={[styles.videoShell, { width, height }]}>
        <VideoView
          player={player}
          style={{ width, height }}
          contentFit="cover"
          nativeControls={false}
        />

        {variant === 'overlay' ? (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.78)']}
            style={styles.scrim}>
            <Text style={styles.overlayName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.overlayMeta}>{item.meta}</Text>
          </LinearGradient>
        ) : null}

        {variant === 'glass' ? (
          <GlassView glassEffectStyle="regular" style={styles.glassChip}>
            <Text style={styles.glassName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.glassMeta}>{item.meta}</Text>
          </GlassView>
        ) : null}
      </View>

      {variant === 'caption' ? (
        <View style={styles.captionRow}>
          <Text style={styles.captionName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.captionMeta}>{item.meta}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Second row — smaller cards, exactly 2.5 visible. */
function SmallRail({ viewportWidth }: { viewportWidth: number }) {
  const gap = Spacing.two + 2;
  const cardWidth = Math.round((viewportWidth - PAGE_MARGIN - 2 * gap) / 2.5);
  const cardHeight = Math.round((cardWidth * 3) / 4);

  return (
    <View style={styles.railBlock}>
      <Text style={styles.sectionTitle}>All stalls</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + gap}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: PAGE_MARGIN }}>
        {RAIL_ITEMS.map((item, index) => (
          <View
            key={item.name}
            style={{
              width: cardWidth,
              marginRight: index === RAIL_ITEMS.length - 1 ? 0 : gap,
            }}>
            <RailTile item={item} width={cardWidth} height={cardHeight} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function RailTile({
  item,
  width,
  height,
}: {
  item: (typeof RAIL_ITEMS)[number];
  width: number;
  height: number;
}) {
  // Rail tiles are thumbnails: they hold their first frame rather than each
  // decoding a stream of their own alongside the carousel above them.
  const player = useVideoPlayer(item.uri, (p) => {
    p.muted = true;
    p.loop = true;
  });

  return (
    <View style={[styles.videoShell, styles.railShell, { width, height }]}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.railScrim}>
        <Text style={styles.railName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.railMeta}>{item.meta}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Fyp.pageBackground,
  },
  safeArea: {
    flex: 1,
  },
  stallsLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#615FFF',
    paddingHorizontal: PAGE_MARGIN,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Fyp.headerTitle,
    paddingHorizontal: PAGE_MARGIN,
    paddingTop: Spacing.two,
  },
  subtitle: {
    fontSize: 13,
    color: Fyp.muted,
    paddingHorizontal: PAGE_MARGIN,
    marginTop: 2,
  },
  variantPicker: {
    height: 28,
    marginHorizontal: PAGE_MARGIN,
    marginTop: Spacing.two + 2,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Fyp.title,
    paddingHorizontal: PAGE_MARGIN,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  filterPicker: {
    height: 32,
    marginHorizontal: PAGE_MARGIN,
    marginBottom: Spacing.three,
  },
  videoShell: {
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: '#1A1D23',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.two + 2,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two + 2,
  },
  overlayName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  overlayMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 1,
  },
  captionRow: {
    paddingTop: Spacing.two,
    paddingHorizontal: 2,
  },
  captionName: {
    fontSize: 15,
    fontWeight: '700',
    color: Fyp.title,
  },
  captionMeta: {
    fontSize: 12,
    color: Fyp.muted,
    marginTop: 1,
  },
  glassChip: {
    position: 'absolute',
    left: Spacing.two,
    bottom: Spacing.two,
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    maxWidth: '80%',
  },
  glassName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  glassMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  railBlock: {
    marginTop: Spacing.four,
  },
  railShell: {
    borderRadius: 14,
  },
  railScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.two + 2,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  railName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  railMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 1,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9CDD4',
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: Fyp.title,
  },
});
