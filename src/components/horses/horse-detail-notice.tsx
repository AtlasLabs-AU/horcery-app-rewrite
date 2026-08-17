import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { OVERLAY_COPY, type DetailOverlay } from '@/hooks/horse-status-data';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Why there are no readings, when there are none.
 *
 * The current app draws these as a translucent **overlay floating on top of**
 * the charts, which leaves half-rendered axes visible underneath and makes the
 * message look like a loading state. Here it replaces the readings entirely:
 * if we cannot show data, we say so instead of showing a ghost of it.
 *
 * The three cases are the current app's own (`OVERLAY_STATES`), reworded from
 * "Connect Stall Monitor for data" into what is actually true for this horse.
 */
export function HorseDetailNotice({ overlay }: { overlay: Exclude<DetailOverlay, 'none'> }) {
  const { colors } = useTokens();
  const copy = OVERLAY_COPY[overlay];

  return (
    <View
      style={[styles.card, { backgroundColor: colors.bed }]}
      testID={`horse-notice-${overlay}`}>
      <Icon name={ICON[overlay]} size={22} color={colors.accent} />
      <View style={styles.text}>
        <Text style={[type.headline, { color: colors.foreground }]}>{copy.title}</Text>
        <Text style={[type.subhead, { color: colors.secondary }]}>{copy.detail}</Text>
      </View>
    </View>
  );
}

const ICON = {
  'no-stall': 'cameraOff',
  'metrics-hidden': 'clock',
  unsupported: 'info',
} as const;

/**
 * Says the app is running on its built-in measurement settings rather than
 * whatever production is serving.
 *
 * Inakshi's decision D7 (2026-08-17): while "where chart configuration lives"
 * is open (requirements §6a-i), the page ships on the queries in the repo and
 * **says so on screen**. A page quietly answering a stale question is exactly
 * the failure we said we would not ship, and a visible line makes the decision
 * unavoidable rather than something we drift past.
 *
 * Delete this the day §6a-i lands and the app reads real configuration.
 */
export function BuiltInSettingsNote() {
  const { colors } = useTokens();
  return (
    <View style={styles.note} testID="horse-builtin-settings-note">
      <Icon name="info" size={13} color={colors.dimmed} />
      <Text style={[type.caption, styles.noteText, { color: colors.dimmed }]}>
        Readings use the app&apos;s built-in settings, not your organisation&apos;s.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  text: { flex: 1, gap: space.xxs },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  noteText: { flex: 1 },
});
