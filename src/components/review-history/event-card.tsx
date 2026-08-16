import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export interface HistoryEvent {
  id: string;
  title: string;
  startTime: string;
  /**
   * Pre-formatted in the ORGANIZATION's timezone by the screen. The card must
   * not re-parse the ISO string: `DateTime.fromISO` resolves to the DEVICE
   * zone, which showed a 15 Aug event as "16 Aug 09:32" on a phone 10.5 hours
   * ahead of the barn (caught on device, 2026-08-15).
   */
  timeLabel: string;
  /** Supported Review events carry footage when a valid clip exists. */
  hasClip: boolean;
  posterUri?: string;
  blurhash?: string;
  durationLabel?: string;
  animalName?: string;
  stallName?: string;
  isAlert: boolean;
  icon: IconName;
}

/**
 * One event card, in the retained current-app anatomy: header row (icon, title,
 * timestamp), footage still, and footer (horse/stall plus the type tag).
 * Legacy manually authored information panels are deliberately absent because
 * the Record feature was removed by product decision on 2026-08-16.
 *
 * **The one deliberate departure: the body is a still, not a live player.**
 * The current app mounts an autoplaying HLS player per card and never
 * releases it (its release code is commented out and its "is this visible"
 * flag is unused), so a busy day on a tablet runs many players at once.
 * Here the card shows a frame with a play badge and playback happens on tap.
 * PRINCIPLES #2, tie-break smooth over showy.
 */
export function EventCard({
  event,
  onPress,
}: {
  event: HistoryEvent;
  onPress?: () => void;
}) {
  const { colors } = useTokens();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${event.title}, ${event.timeLabel}` : undefined}
      testID={`history-event-${event.id}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        pressed && onPress && { opacity: 0.9 },
      ]}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWell, { backgroundColor: colors.fillTonal }]}>
          <Icon name={event.icon} size={16} color={colors.accent} />
        </View>
        <Text style={[type.headline, styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[type.footnote, { color: colors.tertiary }]}>
          {event.timeLabel}
        </Text>
      </View>

      {event.hasClip ? (
        <View style={[styles.still, { backgroundColor: colors.fillTonal }]}>
          {event.posterUri ? (
            <Image
              source={event.posterUri}
              placeholder={event.blurhash ? { blurhash: event.blurhash } : undefined}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          <View style={[styles.playBadge, { backgroundColor: colors.card }]}>
            <Icon name="spaces" size={18} color={colors.accent} />
          </View>
          {event.durationLabel ? (
            <View style={[styles.durationPill, { backgroundColor: colors.inverse }]}>
              <Text style={[type.caption, { color: colors.onInverse }]}>
                {event.durationLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        {event.animalName ? (
          <>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[type.caption, styles.avatarText]}>
                {initials(event.animalName)}
              </Text>
            </View>
            <Text
              style={[type.subhead, styles.animalName, { color: colors.foreground }]}
              numberOfLines={1}>
              {event.animalName}
            </Text>
          </>
        ) : (
          <Text style={[type.subhead, styles.animalName, { color: colors.tertiary }]}>
            {event.stallName ?? ''}
          </Text>
        )}
        <View
          style={[
            styles.tag,
            { backgroundColor: event.isAlert ? colors.statusAlert : colors.fillTonal },
          ]}>
          <Text
            style={[
              type.caption,
              styles.tagText,
              { color: event.isAlert ? '#FFFFFF' : colors.accent },
            ]}>
            {event.title}
          </Text>
        </View>
      </View>
    </Pressable>
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
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
  },
  iconWell: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  still: {
    width: '100%',
    aspectRatio: 3 / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPill: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },
  animalName: { flex: 1 },
  tag: {
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: 3,
  },
  tagText: { fontWeight: '600' },
});
