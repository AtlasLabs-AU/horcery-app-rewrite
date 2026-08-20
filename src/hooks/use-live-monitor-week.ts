import { useQueries } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useMemo } from 'react';

import {
  buildLyingDownWeek,
  type LyingDownWeek,
  type Verdict,
} from '@/charts/lying-down';
import {
  LIVE_PREVIEW_MONITORS,
  PREVIEW_ZONE,
  type LivePreviewMonitor,
} from '@/config/constants/live-preview-monitors';
import { PREVIEWS } from '@/config/previews';
import { fetchLyingDownWeekInputs, liveMonitorRangeWindow } from '@/services/prometheus/monitor-range';

const LIVE_PREVIEW_STALE_TIME_MS = 5 * 60 * 1000;

export interface LiveMonitorWeek {
  monitor: LivePreviewMonitor;
  week: LyingDownWeek;
  /** There is no approved usual curve in this temporary adapter. */
  verdict: Verdict;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

function placeholderWeek(state: LyingDownWeek['state'], now: DateTime): LyingDownWeek {
  const window = liveMonitorRangeWindow({ zone: PREVIEW_ZONE, now });
  return buildLyingDownWeek({
    result: [],
    inStallResult: [],
    selectedDate: window.selectedDate,
    zone: PREVIEW_ZONE,
    dayStartHour: window.dayStartHour,
    now,
    state,
  });
}

/**
 * One React Query request pair per fixed preview monitor. The returned model is
 * already chart-domain data, so the screen never sees a Prometheus response.
 */
export function useLiveMonitorWeeks(): LiveMonitorWeek[] {
  const now = DateTime.now().setZone(PREVIEW_ZONE);
  const window = liveMonitorRangeWindow({ zone: PREVIEW_ZONE, now });
  const queries = useQueries({
    queries: LIVE_PREVIEW_MONITORS.map((monitor) => ({
      queryKey: ['live-preview', monitor.id, window.selectedDate],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchLyingDownWeekInputs(monitor.prometheusBaseUrl, {
          zone: PREVIEW_ZONE,
          now,
          signal,
        }),
      enabled: PREVIEWS.liveMonitorPreview,
      staleTime: LIVE_PREVIEW_STALE_TIME_MS,
    })),
  });

  return useMemo(
    () =>
      LIVE_PREVIEW_MONITORS.map((monitor, index) => {
        const query = queries[index]!;
        const week = query.isPending
          ? placeholderWeek('loading', now)
          : query.isError
            ? placeholderWeek('unavailable', now)
            : query.data
              ? buildLyingDownWeek({
                  result: query.data.result,
                  inStallResult: query.data.inStallResult,
                  selectedDate: query.data.window.selectedDate,
                  zone: PREVIEW_ZONE,
                  dayStartHour: query.data.window.dayStartHour,
                  now,
                })
              : placeholderWeek('loading', now);

        return {
          monitor,
          week,
          // The direct range adapter does not receive an approved historical
          // baseline. Rendering an "unknown" verdict is honest; inventing one
          // would make a welfare claim from an unapproved client threshold.
          verdict: week.today?.totalSeconds === null ? 'no-data' : 'unknown',
          isLoading: query.isPending,
          isRefreshing: query.isRefetching,
          isError: query.isError,
          refetch: query.refetch,
        };
      }),
    [now, queries],
  );
}
