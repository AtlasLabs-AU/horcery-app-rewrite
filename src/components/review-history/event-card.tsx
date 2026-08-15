import { Image } from 'expo-image';
import { DateTime } from 'luxon';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export interface HistoryEvent {
  id: string;
  title: string;
  startTime: string;
  /** Behaviour events carry footage; reported ones carry a note instead. */
  hasClip: boolean;
  posterUri?: string;
  blurhash?: string;
  durationLabel?: string;
  animalName?: string;
  stallName?: string;
  reporter?: string;
  note?: string;
  isAlert: boolean;
  icon: IconName;
}

/**
 * One event card, in the current app's anatomy: header row (icon, title,
 * timestamp), body (footage or an information panel), footer (who and where,
 * plus the type tag).
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
  const time = DateTime.fromISO(event.startTime);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress ? `${event.title}, ${time.toFormat('h:mm a')}` : undefined
      }
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
          {time.toFormat('dd LLL yyyy hh:mm a')}
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
      ) : (
        <View style={[styles.infoPanel, { backgroundColor: colors.bed }]}>
          {event.stallName ? (
            <InfoRow label="Stall" value={event.stallName} />
          ) : null}
          {event.reporter ? <InfoRow label="Reported by" value={event.reporter} /> : null}
          {event.note ? <InfoRow label="Notes" value={event.note} /> : null}
        </View>
      )}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTokens();
  return (
    <View style={styles.infoRow}>
      <Text style={[type.footnote, styles.infoLabel, { color: colors.tertiary }]}>
        {label}
      </Text>
      <Text style={[type.subhead, styles.infoValue, { color: colors.foreground }]}>
        {value}
      </Text>
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
  infoPanel: {
    marginHorizontal: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: space.md,
    gap: space.sm,
  },
  infoRow: { gap: space.xxs },
  infoLabel: {},
  infoValue: {},
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
