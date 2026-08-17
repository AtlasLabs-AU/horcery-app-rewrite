import { StyleSheet, Text, View } from 'react-native';

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
  onPress,
}: {
  event: HistoryEvent;
  onPress?: () => void;
}) {
  const { colors } = useTokens();

  if (event.hasClip) {
    return (
      <MediaTile
        posterUri={event.posterUri}
        blurhash={event.blurhash}
        title={event.animalName ?? event.stallName ?? event.title}
        subtitle={`${event.title} · ${event.timeLabel}`}
        subtitleIcon={event.icon}
        badge={event.durationLabel}
        showPlayBadge
        tag={event.isAlert ? { label: event.title, tone: 'alert' } : undefined}
        onPress={onPress}
        accessibilityLabel={`${event.title}, ${event.animalName ?? event.stallName ?? ''}, ${event.timeLabel}`}
        testID={`history-event-${event.id}`}
      />
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card }]}
      testID={`history-event-${event.id}`}>
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
      </View>
    </View>
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
});
