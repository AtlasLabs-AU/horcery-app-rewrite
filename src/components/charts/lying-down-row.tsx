import { DateTime } from 'luxon';
import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

import {
  formatDuration,
  inStallDisagrees,
  type LyingDownDay,
  type LyingDownWeek,
} from '@/charts/lying-down';

/**
 * Lying Down — one row per horse on the For You Behavior Tracker (design V2).
 *
 * Sized to stack: a customer with five horses gets five of these, so the row
 * must answer "is anything off?" at a glance and nothing more. The detail —
 * individual bouts, the up-and-down pattern that signals colic — belongs on the
 * horse's own screen, where one horse has the whole display.
 *
 * Three things earn their place here:
 *
 * 1. **The usual ribbon.** A cumulative line alone says how long; it does not
 *    say whether that is normal for THIS horse. The ribbon widens through the
 *    day because on a running total "usual" grows as the day goes on — a flat
 *    band would be a different, wrong claim.
 * 2. **The in-stall strip.** The monitor only sees the horse while it is in the
 *    stall. Measured across three real monitors on 2026-08-19, in-stall time
 *    ranged 7.6 h to 22.6 h in one day — the denominator moves further than the
 *    numerator. Without it, a horse turned out all afternoon reads as a horse
 *    that refused to lie down, which is a welfare alarm rather than a fact.
 * 3. **The badge.** Data Science's verdict, rendered not computed.
 *
 * Drawn with plain views rather than a charting engine: a monotonic line, a
 * ribbon and a strip are simpler and cheaper as geometry, and the chart
 * engineering standard §5 asks for the simplest truthful presentation.
 */


export type Verdict = 'usual' | 'low' | 'high' | 'no-data' | 'unknown';

/**
 * Badges carry meaning in words and weight, not colour.
 *
 * The palette reserves red for real alerts and validation — never for data
 * (`tokens.ts`), and the editorial direction puts emphasis in tone and weight
 * rather than tinted blocks. So an unusual day reads as ink on the same bed as
 * every other badge; it stands out because it says "Low", and because the line
 * sits outside its wedge.
 */
const BADGE: Record<Verdict, { label: string; emphatic: boolean }> = {
  usual: { label: 'Usual', emphatic: false },
  low: { label: 'Low', emphatic: true },
  high: { label: 'High', emphatic: true },
  'no-data': { label: 'No data', emphatic: false },
  unknown: { label: 'Not enough history', emphatic: false },
};

export interface LyingDownRowProps {
  horseName: string;
  week: LyingDownWeek;
  /** Data Science's verdict. The row renders it; it never derives it. */
  verdict: Verdict;
  /** Typical total for this horse, in seconds. Shown beside today's figure. */
  averageSeconds: number | null;
  /**
   * This horse's USUAL cumulative progress through the barn day — the shaded
   * wedge behind the line. Supplied by Data Science, never derived here.
   *
   * A curve, not a single number, because a running total's "usual" grows as
   * the day goes on: a flat band would claim the horse should have its whole
   * day's rest by breakfast. `dailyLyingDownAvg` already returns cumulative
   * averages at six-hour checkpoints, which is exactly this shape.
   *
   * Absent → no wedge, just one dashed line at the daily average. A band
   * implies a spread, and inventing that spread would be the phone asserting a
   * distribution nobody gave it.
   */
  usualCurve?: { fractionOfDay: number; lowSeconds: number; highSeconds: number }[];
  width: number;
}

const CHART_HEIGHT = 56;
/** Vertical slices used to draw the usual wedge. Enough to look continuous. */
const SLICES = 36;

/** Linear interpolation between the supplied cumulative checkpoints. */
function sampleCurve(
  curve: { fractionOfDay: number; lowSeconds: number; highSeconds: number }[],
  f: number,
): { low: number; high: number } {
  const first = curve[0]!;
  if (f <= first.fractionOfDay) return { low: first.lowSeconds, high: first.highSeconds };
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1]!;
    const b = curve[i]!;
    if (f <= b.fractionOfDay) {
      const span = b.fractionOfDay - a.fractionOfDay || 1;
      const t = (f - a.fractionOfDay) / span;
      return {
        low: a.lowSeconds + (b.lowSeconds - a.lowSeconds) * t,
        high: a.highSeconds + (b.highSeconds - a.highSeconds) * t,
      };
    }
  }
  const last = curve.at(-1)!;
  return { low: last.lowSeconds, high: last.highSeconds };
}
const STRIP_HEIGHT = 7;

function fraction(at: number, day: LyingDownDay): number {
  const span = day.nextMidnight - day.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (at - day.start) / span));
}

/** The cumulative line, as a stack of thin segments — no charting engine needed. */
function CumulativeLine({
  week,
  day,
  width,
  peakSeconds,
  colour,
}: {
  week: LyingDownWeek;
  day: LyingDownDay;
  width: number;
  peakSeconds: number;
  colour: string;
}) {
  const points = week.cumulative;
  if (points.length < 2) return null;
  const y = (seconds: number) =>
    CHART_HEIGHT - Math.min(1, seconds / Math.max(peakSeconds, 1)) * CHART_HEIGHT;

  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const x1 = fraction(a.at, day) * width;
    const x2 = fraction(b.at, day) * width;
    const y1 = y(a.totalSeconds);
    const y2 = y(b.totalSeconds);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.5) continue;
    segments.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: x1,
          top: y1,
          width: length,
          height: 3,
          borderRadius: 2,
          backgroundColor: colour,
          transform: [
            { translateY: -1.25 },
            { rotateZ: `${Math.atan2(dy, dx)}rad` },
          ],
          transformOrigin: 'left center',
        }}
      />,
    );
  }

  const last = points.at(-1)!;
  return (
    <>
      {segments}
      <View
        style={{
          position: 'absolute',
          left: fraction(last.at, day) * width - 4,
          top: y(last.totalSeconds) - 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colour,
        }}
      />
    </>
  );
}

export function LyingDownRow({
  horseName,
  week,
  verdict,
  averageSeconds,
  usualCurve,
  width,
}: LyingDownRowProps) {
  const { colors } = useTokens();
  const day = week.today;
  const badge = BADGE[verdict];
  const chartWidth = width - 24;

  // Headroom matters: at 1.15 the ribbon filled the plot and flattened the
  // line against the floor. 1.6 keeps the band in the middle third, so the
  // line's position relative to it is the thing the eye picks up.
  const ceiling =
    Math.max(
      day?.totalSeconds ?? 0,
      usualCurve?.at(-1)?.highSeconds ?? 0,
      averageSeconds ?? 0,
      30 * 60,
    ) * 1.6;
  const toY = (seconds: number) =>
    CHART_HEIGHT - Math.min(1, seconds / ceiling) * CHART_HEIGHT;

  const todayLabel =
    day?.totalSeconds === null || day === null
      ? '—'
      : formatDuration(day.totalSeconds);

  return (
    <View style={[styles.row, { width }]}>
      <View style={styles.header}>
        <View style={styles.nameGroup}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {horseName}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.bed }]}>
            <Text
              style={[
                styles.badgeText,
                { color: badge.emphatic ? colors.foreground : colors.secondary },
              ]}>
              {badge.label}
            </Text>
          </View>
        </View>
        <View style={styles.figures}>
          <Text style={[styles.today, { color: colors.foreground }]}>{todayLabel}</Text>
          <Text style={[styles.average, { color: colors.tertiary }]}>
            {averageSeconds === null ? 'no average yet' : `${formatDuration(averageSeconds)} avg`}
          </Text>
        </View>
      </View>

      {day ? (
        <>
          <View style={[styles.chart, { width: chartWidth, height: CHART_HEIGHT, backgroundColor: colors.background }]}>
            {/* The usual wedge, drawn as thin vertical slices so it can follow
                the curve without a charting engine. */}
            {usualCurve && usualCurve.length > 1
              ? Array.from({ length: SLICES }, (_, i) => {
                  const f = i / (SLICES - 1);
                  const { low, high } = sampleCurve(usualCurve, f);
                  const top = toY(high);
                  const height = Math.max(1, toY(low) - top);
                  return (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        left: (f * chartWidth) - 0.5,
                        width: chartWidth / SLICES + 1.5,
                        top,
                        height,
                        backgroundColor: colors.bed,
                      }}
                    />
                  );
                })
              : averageSeconds !== null ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  width: chartWidth,
                  top: toY(averageSeconds),
                  height: 1,
                  backgroundColor: colors.dimmed,
                }}
              />
            ) : null}
            <CumulativeLine week={week} day={day} width={chartWidth} peakSeconds={ceiling} colour={colors.accent} />
          </View>

          {/* in-stall strip — when the horse was observable at all */}
          <View style={[styles.strip, { width: chartWidth, backgroundColor: colors.background }]}>
            {(inStallDisagrees(day) ? [] : day.inStallIntervals).map((interval, index) => (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: fraction(interval.enter, day) * chartWidth,
                  width: Math.max(
                    2,
                    (fraction(interval.exit, day) - fraction(interval.enter, day)) * chartWidth,
                  ),
                  top: 0,
                  height: STRIP_HEIGHT,
                  borderRadius: 3.5,
                  backgroundColor: colors.dimmed,
                }}
              />
            ))}
          </View>

          <View style={[styles.axis, { width: chartWidth }]}>
            {/* The barn day opens and closes on the same clock hour, so the
                label alone is not unique — key by position. */}
            {axisLabels(week.dayStartHour).map((label, index) => (
              <Text key={`${index}-${label}`} style={[styles.axisText, { color: colors.tertiary }]}>
                {label}
              </Text>
            ))}
          </View>

          <Text style={[styles.stallSummary, { color: colors.tertiary }]}>
            {day.inStallSeconds === null || inStallDisagrees(day)
              ? 'In-stall time unavailable'
              : `In stall ${formatDuration(day.inStallSeconds)}`}
          </Text>
        </>
      ) : (
        <Text style={[styles.stallSummary, { color: colors.tertiary }]}>No reading for today</Text>
      )}
    </View>
  );
}

/** Five ticks across the barn day, e.g. 6 AM · 12 PM · 6 PM · 12 AM · 6 AM. */
function axisLabels(dayStartHour: number): string[] {
  const base = DateTime.fromObject({ hour: dayStartHour });
  return [0, 6, 12, 18, 24].map((offset) => base.plus({ hours: offset }).toFormat('h a'));
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, paddingHorizontal: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  figures: { alignItems: 'flex-end' },
  today: { fontSize: 14, fontWeight: '700' },
  average: { fontSize: 10, marginTop: 1 },
  chart: { marginTop: 8, borderRadius: 6, overflow: 'hidden' },
  strip: { height: STRIP_HEIGHT, marginTop: 3, borderRadius: 3 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  axisText: { fontSize: 9 },
  stallSummary: { fontSize: 10.5, marginTop: 5 },
});
