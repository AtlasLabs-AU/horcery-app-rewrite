import { DateTime } from 'luxon';
import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

import {
  formatDuration,
  formatDurationCompact,
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
 * 1. **The usual reference.** A cumulative line alone says how long; it does not
 *    say whether that is normal for THIS horse. It is drawn as a dashed curve
 *    that rises through the day, because on a running total "usual" grows as the
 *    day goes on — a flat line would be a different, wrong claim. This mirrors
 *    the shipping app's grey average line, which plots `dailyLyingDownAvg` at
 *    the 6/12/18/24-hour marks. The fallback, when no curve exists, is one
 *    dashed rule at the daily average.
 * 2. **The in-stall strip.** The monitor only sees the horse while it is in the
 *    stall. Measured across three real monitors on 2026-08-19, in-stall time
 *    ranged 7.6 h to 22.6 h in one day — the denominator moves further than the
 *    numerator. Without it, a horse turned out all afternoon reads as a horse
 *    that refused to lie down, which is a welfare alarm rather than a fact.
 * 3. **The badge.** Data Science's verdict, rendered not computed.
 *
 * COLOUR (Inakshi, 2026-08-19). The reading is a LINE in `chartData` (denim),
 * turning `chartDeviation` (ochre) when the verdict says this horse is outside
 * its own usual range. Ochre is not red: see PRINCIPLES.md, deviation may be
 * coloured, severity may not.
 *
 * A line, not a filled area. Filling it was a detour: the fill was added to give
 * the colour visual weight, but the shipping app draws this as a plain 2.5 pt
 * line and the brief was "a line chart like the app already has, improved for
 * clarity". The fill turned a cumulative curve into a blocky staircase that had
 * to be explained before it could be read, which is the opposite of clarity. A
 * stroked line carries denim and ochre perfectly well.
 *
 * TYPE AND SPACE. Every size comes from the ramp and every gap from the 4 pt
 * scale. This row previously invented 9 px, 10.5 px and 3 px values, which is
 * why `micro` now exists in `tokens.ts`.
 *
 * Drawn with plain views rather than a charting engine: two polylines and a
 * strip are simpler and cheaper as geometry, and the chart engineering standard
 * §5 asks for the simplest truthful presentation.
 */

export type Verdict = 'usual' | 'low' | 'high' | 'no-data' | 'unknown';

/**
 * Deviation — and only deviation — is coloured. "Usual" is the default state
 * and so is the quiet one: five green pills on a normal morning would spend the
 * app's only positive colour on the case that needs no attention. "No data" is
 * hollow, because visually absent is what it means.
 */
type BadgeTone = 'quiet' | 'deviation' | 'absent';

const BADGE: Record<Verdict, { label: string; tone: BadgeTone }> = {
  usual: { label: 'Usual', tone: 'quiet' },
  low: { label: 'Low', tone: 'deviation' },
  high: { label: 'High', tone: 'deviation' },
  'no-data': { label: 'No data', tone: 'absent' },
  unknown: { label: 'No history', tone: 'absent' },
};

export interface LyingDownRowProps {
  horseName: string;
  week: LyingDownWeek;
  /** Data Science's verdict. The row renders it; it never derives it. */
  verdict: Verdict;
  /** Typical total for this horse, in seconds. Shown beside today's figure. */
  averageSeconds: number | null;
  /**
   * This horse's USUAL cumulative progress through the barn day — the dashed
   * reference behind the reading. Supplied by Data Science, never derived here.
   *
   * A curve, not a single number, because a running total's "usual" grows as
   * the day goes on: a flat band would claim the horse should have its whole
   * day's rest by breakfast. `dailyLyingDownAvg` already returns cumulative
   * averages at six-hour checkpoints, which is exactly this shape.
   *
   * Absent → one dashed rule at the daily average instead, which claims only
   * what we actually know. The range's spread is deliberately not drawn: the
   * dashed curve runs through its middle, and the spread belongs on the horse's
   * own screen where one horse has the whole display.
   */
  usualCurve?: { fractionOfDay: number; lowSeconds: number; highSeconds: number }[];
  width: number;
}

const CHART_HEIGHT = 60;
/** Vertical slices for the usual band. Enough to look continuous. */
const BAND_SLICES = 24;
const STRIP_HEIGHT = 6;
/** Fixed columns, so five badges and five figures each share one axis. */
const BADGE_COLUMN = 88;
const FIGURE_COLUMN = 78;

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

function fraction(at: number, day: LyingDownDay): number {
  const span = day.nextMidnight - day.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (at - day.start) / span));
}

/** The cumulative line, as a stack of thin rotated segments. */
function CumulativeEdge({
  points,
  width,
  toY,
  colour,
}: {
  points: { f: number; seconds: number }[];
  width: number;
  toY: (seconds: number) => number;
  colour: string;
}) {
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const x1 = a.f * width;
    const x2 = b.f * width;
    const y1 = toY(a.seconds);
    const y2 = toY(b.seconds);
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
          borderRadius: 1.5,
          backgroundColor: colour,
          transform: [{ translateY: -1.5 }, { rotateZ: `${Math.atan2(dy, dx)}rad` }],
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
        testID="lying-down-reading"
        style={{
          position: 'absolute',
          left: last.f * width - 4,
          top: toY(last.seconds) - 4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colour,
        }}
      />
    </>
  );
}

/**
 * The usual reference, as a dashed curve through the middle of the range.
 *
 * The range's full spread is deliberately NOT drawn here. Filling it made a
 * large pale shape that the eye read as the subject of the chart, with the
 * horse's actual reading as a ribbon beneath it — the same inversion that made
 * the first version unreadable, arriving from the other direction. Showing the
 * middle of a range Data Science gave us is a summary, not an invention; the
 * spread belongs on the horse's own screen, where one horse has the display.
 */
function DashedCurve({
  curve,
  width,
  toY,
  colour,
}: {
  curve: { fractionOfDay: number; lowSeconds: number; highSeconds: number }[];
  width: number;
  toY: (seconds: number) => number;
  colour: string;
}) {
  const samples = Array.from({ length: BAND_SLICES }, (_, i) => {
    const f = i / (BAND_SLICES - 1);
    const { low, high } = sampleCurve(curve, f);
    return { x: f * width, y: toY((low + high) / 2) };
  });

  const dashes = [];
  for (let i = 0; i + 1 < samples.length; i += 2) {
    const a = samples[i]!;
    const b = samples[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.5) continue;
    dashes.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          left: a.x,
          top: a.y,
          width: length,
          height: 1.5,
          backgroundColor: colour,
          transform: [{ translateY: -0.75 }, { rotateZ: `${Math.atan2(dy, dx)}rad` }],
          transformOrigin: 'left center',
        }}
      />,
    );
  }
  return <>{dashes}</>;
}

const DASH = 8;
const DASH_GAP = 6;

/** A horizontal dashed rule — "this is a reference, not a measurement". */
function DashedRule({ y, width, colour }: { y: number; width: number; colour: string }) {
  const count = Math.max(1, Math.floor(width / (DASH + DASH_GAP)));
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * (DASH + DASH_GAP),
            top: y,
            width: DASH,
            height: 1.5,
            backgroundColor: colour,
          }}
        />
      ))}
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
  const { colors, type, space } = useTokens();
  const day = week.today;
  const badge = BADGE[verdict];
  // `width` is the space the row has been given, and the chart uses all of it.
  // The row adds no horizontal padding of its own: its container already pads,
  // and insetting again left the plot short of the hairline drawn between
  // horses — which read as the chart being cut off on the right.
  const chartWidth = width;

  // Ochre replaces denim only when the verdict says this horse is outside its
  // own usual range — never for "no data", which is an absence, not a deviation.
  const seriesColour =
    badge.tone === 'deviation' ? colors.chartDeviation : colors.chartData;

  // Headroom, twice corrected. 1.15 was too tight while the usual range was a
  // solid fill — it filled the plot and flattened the reading against the floor.
  // 1.6 fixed that but, once the reading became the filled area and the range
  // became an outline, it re-created the original fault from the other side: the
  // reading never climbed past a quarter of the height, so on the device it read
  // as a sliver under a grey wedge — the reference looking like the subject
  // again. 1.15 is right for THIS treatment; the number tracks the drawing.
  const usualEnd = usualCurve?.at(-1);
  const ceiling =
    Math.max(
      day?.totalSeconds ?? 0,
      // The midpoint, because the midpoint is what is drawn. Scaling to the
      // range's upper bound reserved height for a shape nobody sees and pressed
      // the reading back down into a ribbon.
      usualEnd ? (usualEnd.lowSeconds + usualEnd.highSeconds) / 2 : 0,
      averageSeconds ?? 0,
      30 * 60,
    ) * 1.15;
  const toY = (seconds: number) =>
    CHART_HEIGHT - Math.min(1, seconds / ceiling) * CHART_HEIGHT;

  const todayLabel =
    day === null || day.totalSeconds === null
      ? '—'
      : formatDurationCompact(day.totalSeconds);

  const points =
    day === null
      ? []
      : week.cumulative.map((point) => ({
          f: fraction(point.at, day),
          seconds: point.totalSeconds,
        }));

  const badgeStyle =
    badge.tone === 'deviation'
      ? { backgroundColor: colors.chartDeviationBed }
      : badge.tone === 'quiet'
        ? { backgroundColor: colors.bed }
        : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider };
  const badgeInk =
    badge.tone === 'deviation'
      ? colors.chartDeviationInk
      : badge.tone === 'quiet'
        ? colors.secondary
        : colors.tertiary;

  return (
    <View style={[styles.row, { width, paddingVertical: space.edge }]}>
      <View style={styles.header}>
        <Text
          style={[type.subhead, styles.name, { color: colors.secondary }]}
          numberOfLines={1}>
          {horseName}
        </Text>
        <View style={styles.badgeColumn}>
          <View style={[styles.badge, badgeStyle, { paddingHorizontal: space.sm }]}>
            <Text style={[type.caption, styles.badgeText, { color: badgeInk }]} numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        </View>
        <Text style={[type.title3, styles.figure, { color: colors.foreground }]} numberOfLines={1}>
          {todayLabel}
        </Text>
      </View>

      <Text style={[type.caption, styles.average, { color: colors.tertiary }]}>
        {averageSeconds === null ? 'no average yet' : `${formatDuration(averageSeconds)} avg`}
      </Text>

      {day ? (
        <>
          <View
            style={[
              styles.chart,
              {
                width: chartWidth,
                height: CHART_HEIGHT,
                marginTop: space.md,
                backgroundColor: colors.background,
              },
            ]}>
            {/* The usual reference: a dashed curve when Data Science supplies
                this horse's typical progress, otherwise a single dashed rule at
                the daily average — which claims only what we actually know. */}
            {usualCurve && usualCurve.length > 1 ? (
              <DashedCurve
                curve={usualCurve}
                width={chartWidth}
                toY={toY}
                colour={colors.chartReference}
              />
            ) : averageSeconds !== null ? (
              <DashedRule
                y={toY(averageSeconds)}
                width={chartWidth}
                colour={colors.chartReference}
              />
            ) : null}

            {points.length > 1 ? (
              <CumulativeEdge
                points={points}
                width={chartWidth}
                toY={toY}
                colour={seriesColour}
              />
            ) : null}
          </View>

          <View style={[styles.axis, { width: chartWidth, marginTop: space.sm }]}>
            {/* The barn day opens and closes on the same clock hour, so the
                label alone is not unique — key by position. */}
            {axisLabels(week.dayStartHour).map((label, index) => (
              <Text key={`${index}-${label}`} style={[type.micro, { color: colors.tertiary }]}>
                {label}
              </Text>
            ))}
          </View>

          {/* Observation coverage, kept with the sentence that explains it.
              The strip sits under 3:1 on purpose: its value is written in words
              immediately below, which is WCAG 1.4.11's own exemption, and
              darkening it would make context shout over the reading. */}
          <View
            style={[
              styles.strip,
              { width: chartWidth, marginTop: space.md, backgroundColor: colors.background },
            ]}>
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
                  borderRadius: STRIP_HEIGHT / 2,
                  backgroundColor: colors.chartTrack,
                }}
              />
            ))}
          </View>

          <Text style={[type.caption, { color: colors.tertiary, marginTop: space.sm }]}>
            {day.inStallSeconds === null || inStallDisagrees(day)
              ? 'In-stall time unavailable'
              : `In stall ${formatDuration(day.inStallSeconds)}`}
          </Text>
        </>
      ) : (
        <Text style={[type.caption, { color: colors.tertiary, marginTop: space.sm }]}>
          No reading for today
        </Text>
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
  row: {},
  header: { flexDirection: 'row', alignItems: 'baseline' },
  name: { flex: 1 },
  badgeColumn: { width: BADGE_COLUMN, alignItems: 'flex-end' },
  badge: { paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontWeight: '600' },
  figure: { width: FIGURE_COLUMN, textAlign: 'right' },
  average: { textAlign: 'right' },
  chart: { borderRadius: 6, overflow: 'hidden' },
  strip: { height: STRIP_HEIGHT, borderRadius: STRIP_HEIGHT / 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
