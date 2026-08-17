import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import {
  IN_STALL_DETAIL,
  IN_STALL_LABELS,
  type InStallStatus,
} from '@/hooks/horse-status-data';
import type { HorseReading } from '@/hooks/use-horse-status';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Where the horse is, and what the stall feels like.
 *
 * **This is the In Stall / Out of Stall status that the list gave up**
 * (Inakshi, 2026-08-16: name and stall only on the list, status lives here).
 *
 * Two things the current app gets wrong and this does not:
 *
 * 1. **It tells the truth when it does not know.** The current pill renders
 *    for in and for out, and renders *nothing* for no-camera, still-loading,
 *    and readings inside the ambiguous band — three different facts that all
 *    look like "fine". Here each has its own words.
 * 2. **The clock is live.** The current status asks Prometheus for the instant
 *    the card was created and keeps re-asking that same instant, so it can
 *    show this morning's answer all afternoon. This reads at the play-head,
 *    which follows the date bar and the barn's clock.
 */
export function HorseStatusStrip({
  status,
  readings,
  atLabel,
}: {
  status: InStallStatus;
  readings: HorseReading[];
  /** "now", or the day being looked at — never left implicit. */
  atLabel: string;
}) {
  const { colors } = useTokens();
  const tone = STATUS_TONE[status];
  const color =
    tone === 'ok' ? colors.statusOk : tone === 'alert' ? colors.statusAlert : colors.tertiary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} testID="horse-status-strip">
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={styles.statusText}>
          <Text style={[type.headline, { color: colors.foreground }]}>
            {IN_STALL_LABELS[status]}
          </Text>
          <Text style={[type.footnote, { color: colors.tertiary }]}>
            {IN_STALL_DETAIL[status]}
          </Text>
        </View>
      </View>

      <Text style={[type.caption, { color: colors.dimmed }]}>{atLabel}</Text>

      {readings.length > 0 ? (
        <View style={[styles.readings, { borderTopColor: colors.divider }]}>
          {readings.map((reading, index) => (
            <Fragment key={reading.label}>
              {index > 0 ? (
                <View style={[styles.separator, { backgroundColor: colors.divider }]} />
              ) : null}
              <View style={styles.reading}>
                <Icon
                  name={READING_ICON[reading.label] ?? 'info'}
                  size={15}
                  color={colors.tertiary}
                />
                <Text style={[type.headline, { color: colors.foreground }]} numberOfLines={1}>
                  {reading.value}
                </Text>
                <Text style={[type.caption, { color: colors.tertiary }]} numberOfLines={1}>
                  {reading.label}
                </Text>
              </View>
            </Fragment>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Only two states get colour. Green means "confirmed good", red means a real
 * problem — and neither applies to "we could not read the sensor", which is
 * an absence, not an alarm (PRINCIPLES colour rules: status chroma is
 * rationed).
 */
const STATUS_TONE: Record<InStallStatus, 'ok' | 'alert' | 'neutral'> = {
  'in-stall': 'ok',
  'out-of-stall': 'alert',
  unsure: 'neutral',
  'no-camera': 'neutral',
  loading: 'neutral',
  unavailable: 'neutral',
};

const READING_ICON: Record<string, IconName> = {
  Activeness: 'rolling',
  Temperature: 'temperature',
  Noise: 'sound',
  Humidity: 'humidity',
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.card,
    gap: space.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dot: { width: 10, height: 10, borderRadius: radius.full, marginTop: space.xs },
  statusText: { flex: 1, gap: space.xxs },
  readings: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    marginTop: space.xxs,
  },
  separator: { width: StyleSheet.hairlineWidth, marginHorizontal: space.sm },
  reading: { flex: 1, alignItems: 'center', gap: space.xxs },
});
