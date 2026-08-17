import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
import { MediaCarousel } from '@/components/media/media-carousel';
import { MediaTile } from '@/components/media/media-tile';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export interface ReviewPreviewEvent {
  id: string;
  title: string;
  horseName: string;
  stallName: string;
  timeLabel: string;
  durationLabel: string;
  icon: IconName;
  posterUri?: string;
  blurhash?: string;
}

/**
 * Review section. On the QA organization this shows its empty state, which is
 * exactly what we need for parity — an empty state is a first-class layout.
 */
export function ReviewCard({
  onFilter,
  onSeeHistory,
  previewEvents,
  children,
}: {
  onFilter?: () => void;
  onSeeHistory?: () => void;
  previewEvents?: readonly ReviewPreviewEvent[];
  /** Review cards when there are any; the empty state renders otherwise. */
  children?: React.ReactNode;
}) {
  const { colors } = useTokens();
  return (
    <SectionCard testID="for-you-review-card">
      <SectionHeader
        title="Review"
        adornment={
          <Pressable
            onPress={onFilter}
            disabled={!onFilter}
            hitSlop={12}
            accessibilityRole={onFilter ? 'button' : undefined}
            accessibilityLabel={onFilter ? 'Filter behaviors' : undefined}
            accessibilityState={{ disabled: !onFilter }}
            testID="for-you-review-filter">
            <Icon name="filter" size={18} color={onFilter ? colors.accent : colors.dimmed} />
          </Pressable>
        }
        action={
          <LinkButton label="See History" onPress={onSeeHistory} testID="for-you-review-history" />
        }
      />
      {children ??
        (previewEvents?.length ? (
          <MediaCarousel
            items={previewEvents}
            keyExtractor={(event) => event.id}
            testID="for-you-review-preview"
            renderItem={(event) => <ReviewPreviewTile event={event} />}
          />
        ) : (
          <ReviewEmptyState />
        ))}
    </SectionCard>
  );
}

/**
 * A non-interactive visual preview until the Review vertical slice lands.
 *
 * Now the shared `MediaTile` in the confirmed overlay treatment: horse on the
 * frame, behaviour and stall on the second line with the behaviour's own
 * glyph, clip length bottom-right. Previously the behaviour sat in a labelled
 * row above the frame and the horse/stall below it — three text zones around
 * one image.
 */
function ReviewPreviewTile({ event }: { event: ReviewPreviewEvent }) {
  return (
    <MediaTile
      posterUri={event.posterUri}
      blurhash={event.blurhash}
      title={event.horseName}
      subtitle={`${event.title} · ${event.stallName}`}
      subtitleIcon={event.icon}
      badge={event.durationLabel}
      accessibilityLabel={`${event.horseName}, ${event.title}, ${event.stallName}, ${event.timeLabel}`}
    />
  );
}

function ReviewEmptyState() {
  const { colors } = useTokens();
  return (
    <View style={[styles.info, { backgroundColor: colors.bed }]} testID="for-you-review-empty">
      <Icon name="info" size={18} color={colors.accent} />
      <Text style={[type.subhead, styles.infoText, { color: colors.secondary }]}>
        Your Stall Monitor will feature recent events that may be of interest to
        you here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: space.edge,
    marginTop: space.edge,
  },
  infoText: {
    flex: 1,
    lineHeight: 21,
  },
});
