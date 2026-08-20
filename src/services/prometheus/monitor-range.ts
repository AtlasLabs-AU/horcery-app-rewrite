import { DateTime } from 'luxon';

import { dayStartHourFrom } from '@/charts/lying-down';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

/**
 * The corrected Data Science detection query. The lowercase label value is
 * deliberate: the upstream `animal_type="Horse"` form returns no series on
 * the three monitored devices. Its approval remains tracked in the chart spec.
 */
export const LYING_DOWN_DETECTION_QUERY =
  'round(clamp_max(avg_over_time(horse_sitting_per_id{animal_type="horse"}[1m30s:30s] offset -1m),1))';

/** Observation coverage denominator for the same stall monitor. */
export const HORSE_IN_STALL_QUERY = 'horse_in_stall';

export const LIVE_PREVIEW_DAYS = 7;
export const RANGE_STEP_SECONDS = 60;

export interface MonitorRangeWindow {
  /** `yyyy-MM-dd` in the preview barn zone, ending the seven-day chart. */
  selectedDate: string;
  start: number;
  end: number;
  dayStartHour: number;
}

export interface LyingDownWeekInputs {
  result: PrometheusRangeSeries[];
  inStallResult: PrometheusRangeSeries[];
  window: MonitorRangeWindow;
}

/**
 * The current barn day starts at 6 AM, not midnight. Before 6 AM, its date is
 * yesterday's so a night of rest is never split across two chart days.
 */
export function liveMonitorRangeWindow({
  zone,
  now,
  days = LIVE_PREVIEW_DAYS,
}: {
  zone: string;
  now: DateTime;
  days?: number;
}): MonitorRangeWindow {
  const localNow = now.setZone(zone);
  const dayStartHour = dayStartHourFrom(undefined);
  const selectedDate = localNow.minus({ hours: dayStartHour }).toFormat('yyyy-MM-dd');
  const endOfWindow = DateTime.fromISO(selectedDate, { zone })
    .startOf('day')
    .plus({ hours: dayStartHour });
  const start = endOfWindow.minus({ days: days - 1 }).toSeconds();

  return {
    selectedDate,
    start,
    end: localNow.toSeconds(),
    dayStartHour,
  };
}

/** Builds the exact bounded read URL without issuing a request (testable). */
export function buildMonitorRangeUrl({
  baseUrl,
  query,
  window,
}: {
  baseUrl: string;
  query: string;
  window: Pick<MonitorRangeWindow, 'start' | 'end'>;
}): string {
  const url = new URL('api/v1/query_range', `${baseUrl.replace(/\/$/, '')}/`);
  url.searchParams.set('query', query);
  url.searchParams.set('start', String(Math.floor(window.start)));
  url.searchParams.set('end', String(Math.floor(window.end)));
  url.searchParams.set('step', String(RANGE_STEP_SECONDS));
  return url.toString();
}

function isRangeSeries(value: unknown): value is PrometheusRangeSeries {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { metric?: unknown; values?: unknown };
  if (!candidate.metric || typeof candidate.metric !== 'object' || Array.isArray(candidate.metric)) {
    return false;
  }
  if (!Array.isArray(candidate.values)) return false;
  return candidate.values.every(
    (sample) =>
      Array.isArray(sample) &&
      sample.length === 2 &&
      typeof sample[0] === 'number' &&
      Number.isFinite(sample[0]) &&
      typeof sample[1] === 'string',
  );
}

/**
 * Validates the narrow Prometheus contract used by the temporary adapter.
 * It deliberately returns the raw `data.result` series without changing any
 * values, labels, order, or missing-data meaning.
 */
export function decodePrometheusRangeResponse(payload: unknown): PrometheusRangeSeries[] {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Prometheus returned an invalid response.');
  }
  const response = payload as { status?: unknown; data?: { result?: unknown } };
  if (response.status !== 'success' || !Array.isArray(response.data?.result)) {
    throw new Error('Prometheus did not return a successful range response.');
  }
  if (!response.data.result.every(isRangeSeries)) {
    throw new Error('Prometheus returned malformed range series.');
  }
  return response.data.result;
}

async function fetchRange(url: string, signal?: AbortSignal): Promise<PrometheusRangeSeries[]> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    throw new Error(`Prometheus range request failed (${response.status}).`);
  }
  return decodePrometheusRangeResponse(await response.json());
}

/**
 * Temporary, dev-only adapter until the backend observation API exists.
 *
 * It is intentionally read-only, has a fixed seven-day/60-second bound, and
 * keeps direct Prometheus knowledge inside `src/services/`.
 */
export async function fetchLyingDownWeekInputs(
  baseUrl: string,
  {
    zone,
    now,
    signal,
  }: {
    zone: string;
    now: DateTime;
    signal?: AbortSignal;
  },
): Promise<LyingDownWeekInputs> {
  const window = liveMonitorRangeWindow({ zone, now });
  const detectionUrl = buildMonitorRangeUrl({
    baseUrl,
    query: LYING_DOWN_DETECTION_QUERY,
    window,
  });
  const inStallUrl = buildMonitorRangeUrl({
    baseUrl,
    query: HORSE_IN_STALL_QUERY,
    window,
  });
  const [result, inStallResult] = await Promise.all([
    fetchRange(detectionUrl, signal),
    fetchRange(inStallUrl, signal),
  ]);

  return { result, inStallResult, window };
}
