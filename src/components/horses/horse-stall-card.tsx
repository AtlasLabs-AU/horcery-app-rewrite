import { DateTime } from 'luxon';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { monitorGapMidday } from '@/charts/fixtures/horse-in-stall-behavior';
import { buildHorseInStallStrip } from '@/charts/horse-in-stall-strip';
import { dayStartHourFrom } from '@/charts/lying-down';
import { HorseInStallStrip } from '@/components/charts/horse-in-stall-strip';
import { Icon } from '@/components/ui/icon';
import { PREVIEWS } from '@/config/previews';
import { useSession } from '@/hooks/use-session';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Which stall this horse is in, the two things you would want to do about it
 * — open the stall, or move the horse — and, beneath, what the stall monitor
 * saw of this horse over the last seven barn days.
 *
 * Both actions are visible and both are disabled, each saying why
 * (requirements §6b item 3). "Re-assign" is a write and the rewrite is
 * read-only against production; the stall row has nowhere to go until the
 * Stalls page exists. A control that is simply absent teaches nothing; one
 * that is dimmed with a reason lets the composition be judged.
 *
 * The chart is the seven-day Horse in Stall strip (Inakshi, 2026-09-05),
 * fixture-backed behind `PREVIEWS.horseInStallSampleData` until two things
 * exist: the approved query, and dated assignment history so each row can
 * come from the stall the horse was actually in that day (defect CQ-8). Until
 * then every row is from the current stall, and the chart says so.
 */

const FALLBACK_ZONE = 'America/Chicago';
const WIDTH_FALLBACK = 320;
const HOUR = 3600;

export function HorseStallCard({ stallName }: { stallName?: string }) {
  const { colors } = useTokens();
  const assigned = !!stallName;
  const [width, setWidth] = useState(WIDTH_FALLBACK);
  const { organization } = useSession();
  const zone = organization?.timezone || FALLBACK_ZONE;
  const dayStartHour = dayStartHourFrom(organization?.chart_start_time);

  /**
   * Sample data, same construction as the For You card: the clock pinned an
   * hour before the barn-day rollover so the preview shows a complete day,
   * a stated normal that does not come from the week being judged, and an
   * established stall so the history gate does not fire. The fixture is the
   * one with a mid-day outage and two silent days, because those are the
   * states this chart most needs to get right.
   *
   * KNOWN LIMIT: the fixture lays its days out on a 06:00 barn day while the
   * card cuts days at the organization's `chart_start_time`. On an org that
   * starts its day elsewhere the preview shows an extra partial stretch on one
   * row that the fixture did not intend. Preview artefact only; the same
   * pattern as For You.
   */
  const sample = useMemo(() => {
    if (!assigned || !PREVIEWS.horseInStallSampleData) return null;
    const now = DateTime.now()
      .setZone(zone)
      .startOf('day')
      .plus({ hours: dayStartHour === 0 ? 23 : dayStartHour - 1 });
    return buildHorseInStallStrip({
      result: monitorGapMidday(now),
      selectedDate: now.minus({ hours: dayStartHour }).toFormat('yyyy-MM-dd'),
      zone,
      dayStartHour,
      now,
      usualSecondsByWeekday: Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((weekday) => [weekday, 19 * HOUR]),
      ),
      entityCreatedAt: now.minus({ months: 6 }).toISO(),
    });
  }, [assigned, zone, dayStartHour]);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card }]}
      testID="horse-stall-card"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width - space.card * 2)}>
      <View style={styles.headerRow}>
        <Text style={[type.title3, { color: colors.foreground }]}>Stall</Text>
        <View style={styles.disabledAction} testID="horse-stall-reassign">
          <Text style={[type.subhead, { color: colors.dimmed }]}>
            {assigned ? 'Re-assign' : 'Assign'}
          </Text>
        </View>
      </View>

      <View style={[styles.row, { backgroundColor: colors.bed }]} testID="horse-stall-row">
        <Icon
          name={assigned ? 'inStall' : 'info'}
          size={20}
          color={assigned ? colors.accent : colors.tertiary}
        />
        <View style={styles.rowText}>
          {/* Wraps rather than truncates: a stall's name is the fact this row
              exists to show, and "Stall 12 – Barn B north…" is not it. */}
          <Text style={[type.headline, { color: assigned ? colors.foreground : colors.secondary }]}>
            {stallName ?? 'No stall assigned'}
          </Text>
          <Text style={[type.footnote, { color: colors.tertiary }]}>
            {assigned
              ? 'Stall page coming with the Stalls rebuild'
              : 'Assigning a stall comes with the write side'}
          </Text>
        </View>
        <Icon name="chevronRight" size={14} color={colors.dimmed} />
      </View>

      {sample ? (
        <View testID="horse-stall-chart">
          <HorseInStallStrip
            data={sample}
            width={width}
            // CQ-8, said out loud rather than hidden: until assignment history
            // is dated, every row is from the stall the horse is in now.
            sourceNote={`From ${stallName}, the stall this horse is in now`}
            testID="horse-in-stall-strip"
          />
          <Text style={[type.footnote, styles.sampleNotice, { color: colors.tertiary }]}>
            Sample data — not this horse
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.card,
    gap: space.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disabledAction: { minHeight: 32, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    opacity: 0.85,
  },
  rowText: { flex: 1, gap: space.xxs },
  sampleNotice: { marginTop: space.sm, textAlign: 'center' },
});
