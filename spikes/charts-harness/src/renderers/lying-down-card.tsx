import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  buildLyingDownWeek,
  comparisonSentence,
  dayLabel,
  formatDuration,
  headline,
  type LyingDownDay,
  type LyingDownWeek,
} from '@/charts/lying-down';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

/**
 * For You — Lying Down card, preview build.
 *
 * Answers one question: "How much has my horse lain down today, when, and is
 * that normal for it?"
 *
 * Deliberately NOT a cumulative Today-vs-Typical line. Real data shows 2–4
 * lying-down bouts a day, so showing *when* costs nothing and preserves the
 * pattern — three calm rests versus eight up-downs in an hour read identically
 * as a total, and the second is colic.
 *
 * Presentation choice per the chart engineering standard §5 ("simplest truthful
 * presentation"): today's bouts are positioned rectangles on one 24-hour track.
 * A charting library adds nothing to a single row of intervals. The seven-day
 * comparison is the only part that earns a real chart.
 */

const ZONE = 'America/Chicago';
const STEP = 60;
const COLOURS = {
  down: '#0369A1',
  downToday: '#0369A1',
  track: '#EFF3F7',
  typical: '#94A3B8',
  ink: '#0F172A',
  muted: '#64748B',
  missing: '#E2E8F0',
};

/** Realistic sample data: bout counts and durations measured from sm-1275/1272/1212. */
function buildFixtureSeries(now: DateTime): PrometheusRangeSeries[] {
  const start = now.minus({ days: 6 }).startOf('day');
  // day offset -> [startHour, minutes] bouts. 2–4 a day, mostly overnight.
  const plan: [number, number][][] = [
    [[1, 42], [4, 35], [22, 28]],
    [[2, 55], [5, 20]],
    [[0, 38], [3, 47], [13, 22], [23, 31]],
    [[1, 25], [4, 60]],
    [[2, 44], [6, 18], [21, 36]],
    [[1, 51], [3, 29], [14, 19]],
    [[1, 48], [4, 33]],
  ];
  const ranges: [number, number][] = [];
  plan.forEach((bouts, dayOffset) => {
    for (const [hour, minutes] of bouts) {
      const from = start.plus({ days: dayOffset, hours: hour });
      if (from > now) continue;
      ranges.push([from.toSeconds(), from.plus({ minutes }).toSeconds()]);
    }
  });

  const values: [number, string][] = [];
  for (let t = start.toSeconds(); t <= now.toSeconds(); t += STEP) {
    values.push([t, ranges.some(([a, b]) => t >= a && t < b) ? '1' : '0']);
  }
  return [{ metric: { animal_type: 'horse', id: '0' }, values }];
}

/** Today's bouts on a single 24-hour track — the "when". */
function TodayTrack({ day, width }: { day: LyingDownDay; width: number }) {
  // Positioned against the WHOLE barn day, so 2 AM sits where 2 AM belongs and
  // the part of the day that has not happened yet stays visibly empty.
  const span = day.nextMidnight - day.start;
  const elapsed = ((day.end - day.start) / span) * width;
  return (
    <View style={[styles.track, { width }]}>
      <View style={[styles.elapsed, { width: elapsed }]} />
      {day.bouts.map((bout, index) => {
        const left = ((bout.enter - day.start) / span) * width;
        const w = Math.max(3, ((bout.exit - bout.enter) / span) * width);
        return (
          <View
            key={index}
            style={[styles.bout, { left, width: w, backgroundColor: COLOURS.downToday }]}
          />
        );
      })}
    </View>
  );
}

function WeekBars({ week, width }: { week: LyingDownWeek; width: number }) {
  const totals = week.days.map((d) => d.totalSeconds ?? 0);
  const peak = Math.max(60 * 60, ...totals);
  const slot = width / week.days.length;
  return (
    <View style={[styles.weekRow, { width }]}>
      {week.days.map((day) => {
        const missing = day.totalSeconds === null;
        const h = missing ? 6 : Math.max(2, (day.totalSeconds! / peak) * 92);
        return (
          <View key={day.key} style={{ width: slot, alignItems: 'center' }}>
            <View style={styles.barSlot}>
              <View
                style={{
                  width: 16,
                  height: h,
                  borderRadius: 4,
                  backgroundColor: missing ? COLOURS.missing : COLOURS.down,
                  opacity: day.isToday ? 1 : 0.55,
                }}
              />
            </View>
            <Text style={styles.dayTick}>{dayLabel(day, week.zone).split(' ')[1]}</Text>
            <Text style={styles.dayValue}>
              {missing ? '—' : formatDuration(day.totalSeconds!).replace(' min', 'm').replace(' h', 'h')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function LyingDownCard({ width }: { width: number }) {
  const week = useMemo(() => {
    const now = DateTime.fromISO('2026-08-19T18:20:00', { zone: ZONE });
    return buildLyingDownWeek({
      result: buildFixtureSeries(now),
      selectedDate: now.toFormat('yyyy-MM-dd'),
      zone: ZONE,
      now,
      // Supplied by the backend in production — never computed on the phone.
      comparison: { typicalByNowSeconds: 95 * 60, verdict: 'less-than-usual', basisDays: 28 },
    });
  }, []);

  const title = headline(week);
  const compare = comparisonSentence(week);
  const today = week.today;
  const inner = width - 32;

  return (
    <View style={[styles.card, { width }]}>
      <Text style={styles.cardTitle}>Lying down</Text>

      {title ? (
        <Text style={styles.headline}>{title}</Text>
      ) : (
        <Text style={styles.unavailable}>No reading available</Text>
      )}
      {compare ? <Text style={styles.compare}>{compare}</Text> : null}

      {today && today.totalSeconds !== null ? (
        <>
          <Text style={styles.sectionLabel}>When, today</Text>
          <TodayTrack day={today} width={inner} />
          <View style={[styles.axisRow, { width: inner }]}>
            {['12 AM', '6 AM', '12 PM', '6 PM', 'now'].map((t) => (
              <Text key={t} style={styles.axisTick}>{t}</Text>
            ))}
          </View>
          <Text style={styles.boutSummary}>
            {today.bouts.length} {today.bouts.length === 1 ? 'time' : 'separate times'} today
          </Text>
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Last 7 days</Text>
      <WeekBars week={week} width={inner} />

      {week.state !== 'ready' ? (
        <Text style={styles.state}>State: {week.state}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  cardTitle: { color: COLOURS.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  headline: { color: COLOURS.ink, fontSize: 26, fontWeight: '700', marginTop: 2 },
  compare: { color: COLOURS.muted, fontSize: 15, marginBottom: 6 },
  unavailable: { color: COLOURS.muted, fontSize: 20, fontWeight: '600' },
  sectionLabel: {
    color: COLOURS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  track: {
    height: 26,
    borderRadius: 6,
    backgroundColor: COLOURS.track,
    overflow: 'hidden',
  },
  elapsed: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#E3EAF2' },
  bout: { position: 'absolute', top: 3, bottom: 3, borderRadius: 3 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisTick: { color: COLOURS.muted, fontSize: 10 },
  boutSummary: { color: COLOURS.muted, fontSize: 12, marginTop: 6 },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barSlot: { height: 96, justifyContent: 'flex-end' },
  dayTick: { color: COLOURS.muted, fontSize: 10, marginTop: 6 },
  dayValue: { color: COLOURS.ink, fontSize: 11, fontWeight: '600', marginTop: 1 },
  state: { color: '#B45309', fontSize: 11, marginTop: 10 },
});
