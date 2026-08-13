import { Host } from '@expo/ui';
import { Picker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { frame, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
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
 * PROTOTYPES — snapshot video carousel, four layouts.
 *
 * Throwaway exploration, deliberately on its own branch: which treatment of a
 * swipeable 4:3 video carousel looks premium with the fewest components?
 *
 *   1 Overlay — store name on a dark gradient scrim over the video
 *   2 Caption — text below the video, never overlapping it
 *   3 Peek    — next video's edge visible, invites the swipe
 *   4 Glass   — floating liquid-glass name chip inside the video
 *
 * Component budget, kept deliberately tiny: native paging ScrollView,
 * expo-video, expo-linear-gradient (scrim), expo-glass-effect (variant 4),
 * and an @expo/ui segmented Picker to flip variants. Everything else is a
 * plain View.
 */

const RADIUS = 18;
const PAGE_MARGIN = Spacing.three;

// Google's classic gtv-videos-bucket samples now return 403; these are
// verified reachable (curl 200) as of 2026-08-13.
const ITEMS = [
  {
    uri: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
    name: 'Claire Murphy',
    meta: 'Stall 4 · Barn A',
  },
  {
    uri: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
    name: 'Midnight',
    meta: 'Stall 7 · Barn A',
  },
  {
    uri: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
    name: 'Golden Boy',
    meta: 'Stall 2 · Barn B',
  },
];

type Variant = 'overlay' | 'caption' | 'peek' | 'glass';

const VARIANTS: { label: string; value: Variant; blurb: string }[] = [
  { label: 'Overlay', value: 'overlay', blurb: 'Name on a gradient scrim over the video' },
  { label: 'Caption', value: 'caption', blurb: 'Text below the video — nothing overlaps' },
  { label: 'Peek', value: 'peek', blurb: 'Next video peeks in from the right' },
  { label: 'Glass', value: 'glass', blurb: 'Floating liquid-glass chip inside the video' },
];

export default function CarouselPrototypes() {
  const [variant, setVariant] = useState<Variant>('overlay');
  const { width } = useWindowDimensions();
  const active = VARIANTS.find((v) => v.value === variant)!;

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text style={styles.title}>Snapshot carousel</Text>
        <Text style={styles.subtitle}>Prototype — 4 layouts, swipe the videos</Text>

        <Host style={styles.picker}>
          <Picker
            selection={variant}
            onSelectionChange={(v) => setVariant(v as Variant)}
            modifiers={[
              pickerStyle('segmented'),
              frame({ width: width - PAGE_MARGIN * 2, height: 32 }),
            ]}>
            {VARIANTS.map((v) => (
              <SwiftUIText key={v.value} modifiers={[tag(v.value)]}>
                {v.label}
              </SwiftUIText>
            ))}
          </Picker>
        </Host>
        <Text style={styles.blurb}>{active.blurb}</Text>

        <Carousel key={variant} variant={variant} viewportWidth={width} />
      </SafeAreaView>
    </View>
  );
}

/** One carousel, styled per variant. Owns its own page state. */
function Carousel({
  variant,
  viewportWidth,
}: {
  variant: Variant;
  viewportWidth: number;
}) {
  const [page, setPage] = useState(0);

  const peek = variant === 'peek';
  // Peek: card narrower than the viewport so the next one shows. Others: full
  // width minus the page margins.
  const cardWidth = peek
    ? Math.round(viewportWidth * 0.82)
    : viewportWidth - PAGE_MARGIN * 2;
  const cardHeight = Math.round((cardWidth * 3) / 4); // 4:3
  const gap = Spacing.two + 2;
  const interval = peek ? cardWidth + gap : viewportWidth;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Native paging behaviour either way: pagingEnabled for full-width
        // pages, snap-to-interval for the peek layout.
        pagingEnabled={!peek}
        snapToInterval={peek ? interval : undefined}
        decelerationRate="fast"
        contentContainerStyle={peek ? { paddingHorizontal: PAGE_MARGIN } : undefined}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / interval))
        }>
        {ITEMS.map((item, index) => (
          <View
            key={item.name}
            style={
              peek
                ? { width: cardWidth, marginRight: index === ITEMS.length - 1 ? 0 : gap }
                : { width: viewportWidth, paddingHorizontal: PAGE_MARGIN }
            }>
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
        {ITEMS.map((_, index) => (
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
    p.play();
  });

  // Only the page in view plays; neighbours hold their frame.
  if (active && !player.playing) player.play();
  if (!active && player.playing) player.pause();

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
            <Text style={styles.overlayName}>{item.name}</Text>
            <Text style={styles.overlayMeta}>{item.meta}</Text>
          </LinearGradient>
        ) : null}

        {variant === 'peek' ? (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.72)']}
            style={styles.scrim}>
            <Text style={styles.overlayName}>{item.name}</Text>
            <Text style={styles.overlayMeta}>{item.meta}</Text>
          </LinearGradient>
        ) : null}

        {variant === 'glass' ? (
          <GlassView glassEffectStyle="regular" style={styles.glassChip}>
            <Text style={styles.glassName}>{item.name}</Text>
            <Text style={styles.glassMeta}>{item.meta}</Text>
          </GlassView>
        ) : null}
      </View>

      {variant === 'caption' ? (
        <View style={styles.captionRow}>
          <Text style={styles.captionName}>{item.name}</Text>
          <Text style={styles.captionMeta}>{item.meta}</Text>
        </View>
      ) : null}
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
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Fyp.headerTitle,
    paddingHorizontal: PAGE_MARGIN,
    paddingTop: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    color: Fyp.muted,
    paddingHorizontal: PAGE_MARGIN,
    marginTop: 2,
  },
  picker: {
    height: 32,
    marginHorizontal: PAGE_MARGIN,
    marginTop: Spacing.three,
  },
  blurb: {
    fontSize: 13,
    color: Fyp.muted,
    paddingHorizontal: PAGE_MARGIN,
    marginTop: Spacing.two,
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  overlayName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
  overlayMeta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginTop: 2,
  },
  captionRow: {
    paddingTop: Spacing.two + 2,
    paddingHorizontal: 2,
  },
  captionName: {
    fontSize: 17,
    fontWeight: '700',
    color: Fyp.title,
  },
  captionMeta: {
    fontSize: 13,
    color: Fyp.muted,
    marginTop: 1,
  },
  glassChip: {
    position: 'absolute',
    left: Spacing.two + 2,
    bottom: Spacing.two + 2,
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  glassName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  glassMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
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
