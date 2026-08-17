import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useTokens } from '@/hooks/use-tokens';
import { radius, space } from '@/constants/tokens';

/**
 * Tile width as a fraction of the SCREEN, not of the card it sits in.
 *
 * 0.62 puts one full tile plus ~60% of the next on screen — squarely in the
 * "1.5 to 2 visible" band, where the partial next tile IS the scroll
 * affordance and the dots only have to say where you are. Carried over from
 * the carousel prototype and confirmed 2026-08-17, when Inakshi found the
 * two-up grid's 178pt tiles too small.
 */
const TILE_FRACTION = 0.62;

/**
 * A swipeable row of media tiles.
 *
 * **It deliberately measures the screen, not its parent.** A For You section
 * card is inset twice — 16pt screen margin, then 20pt card padding — so a
 * two-up row inside it could only ever give each tile 178pt. The row bleeds
 * back out to the card's edges (`marginHorizontal: -space.card`) and sizes
 * its tiles against the full width, which is what makes them big.
 *
 * Every item is rendered. The previous Snapshots row drew `slice(0, columns)`
 * under a row of page dots — the UI asserting content it never rendered
 * (requirements §6b finding 6). A carousel cannot do that: the invariant is
 * structural now rather than something a helper has to protect.
 */
export function MediaCarousel<T>({
  items,
  keyExtractor,
  renderItem,
  showDots = true,
  testID,
}: {
  items: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  /** `live` is true for the snapped tile only — one player at most. */
  renderItem: (item: T, index: number, live: boolean) => React.ReactNode;
  showDots?: boolean;
  testID?: string;
}) {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const tileWidth = Math.round(width * TILE_FRACTION);
  const interval = tileWidth + space.md;

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setPage(Math.round(event.nativeEvent.contentOffset.x / interval));
    },
    [interval],
  );

  if (!items.length) return null;

  return (
    <View testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={onMomentumScrollEnd}>
        {items.map((item, index) => (
          <View
            key={keyExtractor(item, index)}
            style={{
              width: tileWidth,
              marginRight: index === items.length - 1 ? 0 : space.md,
            }}>
            {renderItem(item, index, index === page)}
          </View>
        ))}
      </ScrollView>

      {showDots && items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, index) => (
            <View
              key={keyExtractor(item, index)}
              style={[
                styles.dot,
                { backgroundColor: index === page ? colors.accent : colors.dimmed },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** Bleed out of the section card's padding so tiles get the full width. */
  scroll: {
    marginHorizontal: -space.card,
    marginTop: space.edge,
  },
  /** …and put the left inset back, so tile one aligns with the card's text. */
  content: { paddingHorizontal: space.card },
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
