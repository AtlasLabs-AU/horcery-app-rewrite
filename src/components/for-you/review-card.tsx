import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
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
          <View style={styles.previewRow} testID="for-you-review-preview">
            {previewEvents.slice(0, 2).map((event) => (
              <ReviewPreviewTile key={event.id} event={event} />
            ))}
          </View>
        ) : (
          <ReviewEmptyState />
        ))}
    </SectionCard>
  );
}

/** A non-interactive visual preview until the Review vertical slice lands. */
function ReviewPreviewTile({ event }: { event: ReviewPreviewEvent }) {
  const { colors } = useTokens();
  return (
    <View style={[styles.previewTile, { backgroundColor: colors.bed }]}>
      <View style={styles.previewTitleRow}>
        <Icon name={event.icon} size={15} color={colors.accent} />
        <Text style={[type.footnote, styles.previewTitle, { color: colors.foreground }]} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
      <View style={[styles.poster, { backgroundColor: colors.fillTonal }]}>
        <Image
          source={event.posterUri}
          placeholder={event.blurhash ? { blurhash: event.blurhash } : undefined}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessible
          accessibilityLabel={`${event.horseName} ${event.title} preview`}
        />
        <View style={[styles.duration, { backgroundColor: colors.inverse }]}>
          <Text style={[type.caption, { color: colors.onInverse }]}>{event.durationLabel}</Text>
        </View>
      </View>
      <Text style={[type.subhead, styles.horseName, { color: colors.foreground }]} numberOfLines={1}>
        {event.horseName}
      </Text>
      <Text style={[type.caption, { color: colors.tertiary }]} numberOfLines={1}>
        {`${event.stallName} · ${event.timeLabel}`}
      </Text>
    </View>
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
  previewRow: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.edge,
  },
  previewTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: space.sm,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  previewTitle: { flex: 1, fontWeight: '600' },
  poster: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  duration: {
    position: 'absolute',
    right: space.xs,
    bottom: space.xs,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
  },
  horseName: {
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
    fontWeight: '600',
  },
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
