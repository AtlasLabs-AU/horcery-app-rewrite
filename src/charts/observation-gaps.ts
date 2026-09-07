import { isUsablePrometheusSample, type PrometheusRangeSeries } from './occupancy-timeline';

/** A stretch of time the monitor did not report. Epoch seconds. */
export interface ObservationGap {
  enter: number;
  exit: number;
}

/**
 * Never call a gap an outage below this, whatever the measured cadence says.
 * Prometheus drops the odd scrape under load; a chart that cried "offline" at
 * every missed sample would be ignored within a week.
 */
export const MIN_GAP_SECONDS = 300;

/**
 * Stretches between `from` and `to` that the monitor did not report.
 *
 * The one shared answer to "was anybody watching?", which every chart on a
 * stall monitor has to ask before it can say anything about what happened. A
 * hole in the data has two meanings — the horse was out, or the camera was
 * down — and presenting the second as the first is the shipping app's
 * missing-data-reads-as-fact bug in whichever chart repeats it.
 *
 * The cadence is measured from the data rather than assumed: these queries
 * have shipped at 30 s, 60 s and 90 s steps, so a hardcoded step would silently
 * stop detecting gaps the day someone tuned the query. A gap counts at four
 * times the usual spacing, and never under `MIN_GAP_SECONDS`.
 *
 * Corrupt samples (NaN, non-numeric) are not evidence of coverage; they are
 * dropped before the cadence is measured, so a run of them reads as a gap.
 */
export function observationGaps(
  result: readonly PrometheusRangeSeries[],
  from: number,
  to: number,
): ObservationGap[] {
  const stamps = [
    ...new Set(
      result.flatMap((series) =>
        series.values
          .filter(isUsablePrometheusSample)
          .map(([at]) => at)
          .filter((at) => at >= from && at <= to),
      ),
    ),
  ].sort((a, b) => a - b);

  if (stamps.length === 0) return to > from ? [{ enter: from, exit: to }] : [];

  const steps = stamps
    .slice(1)
    .map((at, i) => at - stamps[i]!)
    .sort((a, b) => a - b);
  const median = steps[Math.floor(steps.length / 2)] ?? 60;
  const limit = Math.max(median * 4, MIN_GAP_SECONDS);

  const gaps: ObservationGap[] = [];
  if (stamps[0]! - from > limit) gaps.push({ enter: from, exit: stamps[0]! });
  for (let i = 1; i < stamps.length; i++) {
    if (stamps[i]! - stamps[i - 1]! > limit) {
      gaps.push({ enter: stamps[i - 1]!, exit: stamps[i]! });
    }
  }
  const last = stamps.at(-1)!;
  if (to - last > limit) gaps.push({ enter: last, exit: to });
  return gaps;
}
