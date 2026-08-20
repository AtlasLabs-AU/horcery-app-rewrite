import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaTile } from '@/components/media/media-tile';
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
  /** Behaviour events carry footage; reported ones carry a note instead. */
  hasClip: boolean;
  posterUri?: string;
  videoUri?: string;
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
 * One event in the history.
 *
 * **Restructured 2026-08-17** onto the shared `MediaTile` in its confirmed
 * overlay treatment, so a clip here looks like a camera frame anywhere else
 * in the app: 4:3 (was 3:2 — the only frame in the app that wasn't), horse
 * and behaviour captioned ON the frame, clip length bottom-right, and the
 * alert tag top-right where it reads against any image. The separate header
 * row (icon well, title, timestamp) and footer row (avatar, name, tag) are
 * gone; their content moved onto the frame.
 *
 * **The one deliberate departure from the current app stands:** the body is a
 * still with a play badge, not a live player. The current app mounts an
 * autoplaying HLS player per card and never releases it (its release code is
 * commented out and its "is this visible" flag is unused), so a busy day on a
 * tablet runs many players at once. PRINCIPLES #2, tie-break smooth over
 * showy.
 *
 * Events with no footage — a stall check, a note — keep the written panel:
 * there is no frame to caption.
 */
export function EventCard({
  event,
  playing = false,
  onPress,
  onPlaybackError,
  actionHint,
}: {
  event: HistoryEvent;
  playing?: boolean;
  onPress?: () => void;
  onPlaybackError?: () => void;
  /** Accessible outcome for a non-playback press, such as opening this moment. */
  actionHint?: string;
}) {
  const { colors } = useTokens();
  const canPress = !!onPress;
  const canPlay = !!event.videoUri && canPress && !actionHint;
  const hasVisual = !!event.posterUri || !!event.blurhash || !!event.videoUri;

  if (event.hasClip && hasVisual) {
    return (
      <MediaTile
        posterUri={event.posterUri}
        blurhash={event.blurhash}
        videoUri={playing ? event.videoUri : undefined}
        live={playing}
        onPlaybackError={onPlaybackError}
        title={event.animalName ?? event.stallName ?? event.title}
        subtitle={`${event.title} · ${event.timeLabel}`}
        subtitleIcon={event.icon}
        badge={event.durationLabel}
        showPlayBadge={canPlay && !playing}
        tag={event.isAlert ? { label: event.title, tone: 'alert' } : undefined}
        onPress={canPress ? onPress : undefined}
        accessibilityLabel={`${event.title}, ${event.animalName ?? event.stallName ?? ''}, ${event.timeLabel}${
          actionHint
            ? `, ${actionHint}`
            : canPlay
              ? (playing ? ', tap to stop video' : ', tap to play video')
              : ''
        }`}
        testID={`history-event-${event.id}`}
      />
    );
  }

  const writtenCard = (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <Icon name={event.icon} size={18} color={colors.accent} />
        <Text
          style={[type.headline, styles.title, { color: colors.foreground }]}
          numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[type.footnote, { color: colors.tertiary }]}>{event.timeLabel}</Text>
      </View>

      <View style={[styles.infoPanel, { backgroundColor: colors.bed }]}>
        {event.animalName ? <InfoRow label="Horse" value={event.animalName} /> : null}
        {event.stallName ? <InfoRow label="Stall" value={event.stallName} /> : null}
        {event.reporter ? <InfoRow label="Reported by" value={event.reporter} /> : null}
        {event.note ? <InfoRow label="Notes" value={event.note} /> : null}
        {event.hasClip ? <InfoRow label="Footage" value="Unavailable" /> : null}
      </View>
    </View>
  );

  if (!canPress) {
    return <View testID={`history-event-${event.id}`}>{writtenCard}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.animalName ?? event.stallName ?? ''}, ${event.timeLabel}${actionHint ? `, ${actionHint}` : ''}`}
      testID={`history-event-${event.id}`}
      style={({ pressed }) => pressed && styles.pressed}>
      {writtenCard}
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTokens();
  return (
    <View style={styles.infoRow}>
      <Text style={[type.footnote, { color: colors.tertiary }]}>{label}</Text>
      <Text style={[type.subhead, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: space.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
  },
  title: { flex: 1 },
  infoPanel: {
    marginHorizontal: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: space.md,
    gap: space.sm,
  },
  infoRow: { gap: space.xxs },
  pressed: { opacity: 0.65 },
});
