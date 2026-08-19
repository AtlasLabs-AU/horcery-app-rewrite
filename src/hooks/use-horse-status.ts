import { useQuery } from '@tanstack/react-query';
import type { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';

import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import {
  ACTIVENESS_STATISTICS_DATA,
  ANIMAL_IN_STALL,
  SENSOR_METRIC,
  STATISTICS_CARD_DATA,
} from '@/config/constants/prometheus-queries';
import {
  activenessCategory,
  deriveScoreCardDisplay,
  deriveInStallStatus,
  formatTemperature,
  noiseCategory,
  type InStallStatus,
} from '@/hooks/horse-status-data';
import { stallHasMetrics, stallHasMonitor } from '@/hooks/horses-data';
import { liveSliceFor } from '@/hooks/playhead-data';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  firstPointValue,
  metricPointReading,
  singlePointReading,
} from '@/services/prometheus/horse-readings';


export type HorseReadingLabel = 'Activeness' | 'Temperature' | 'Noise Level';

export interface HorseReading {
  label: HorseReadingLabel;
  value: string;
  state: ReturnType<typeof deriveScoreCardDisplay>['state'];
  detail?: string;
}

export interface HorseStatus {
  status: InStallStatus;
  readings: HorseReading[];
  /** Whether a stall monitor is fitted at all — separate from `enabled`. */
  hasMonitor: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

/**
 * The horse's live readings at the play-head instant.
 *
 * Three requests against the stall's own Prometheus — in-stall detection,
 * the sensor bundle (temperature, humidity, noise and light arrive together,
 * which is why the strip is not four requests), and activeness.
 *
 * **All are disabled when there is no monitor**, so a horse without a camera
 * costs nothing rather than firing requests that can only fail. The current
 * app fires its in-stall query per visible card on the list; here it belongs
 * to one page, for one horse.
 */
export function useHorseStatus({
  stall,
  cursor,
  isLive,
  nowMillis,
  enabled = true,
}: {
  stall: IStall | undefined;
  cursor: DateTime;
  isLive: boolean;
  nowMillis: number;
  enabled?: boolean;
}): HorseStatus {
  const isMetric = useAuthStore((s) => s.userPreferences?.isMetric ?? true);
  const isOnline = useOnlineStatus();

  const hasMonitor = stallHasMonitor(stall);
  const canQuery = stallHasMetrics(stall);
  const active = enabled && canQuery;
  // Never interpolate an absent URL: `${undefined}/` is a real string, and it
  // would become a shared cache key across every stall-less horse — and a real
  // request the moment anything widened `enabled`.
  const baseUrl = canQuery ? `${stall?.prometheus_url}/` : '';
  // Quantised, NOT the raw cursor — see `liveSliceFor`. The raw cursor moves
  // every minute and would mint a new query key each time.
  const atSeconds = liveSliceFor(cursor);

  const inStall = useQuery({
    ...queries.prometheus.query(baseUrl, ANIMAL_IN_STALL, [
      { key: 'time', value: `${atSeconds}` },
    ]),
    enabled: active,
  });

  const sensors = useQuery({
    ...queries.prometheus.query(baseUrl, STATISTICS_CARD_DATA, [
      { key: 'time', value: `${atSeconds}` },
    ]),
    enabled: active,
  });

  const activeness = useQuery({
    ...queries.prometheus.query(baseUrl, ACTIVENESS_STATISTICS_DATA, [
      { key: 'time', value: `${atSeconds}` },
    ]),
    enabled: active,
  });

  const status = useMemo(
    () =>
      deriveInStallStatus({
        value: firstPointValue(inStall.data),
        hasMonitor,
        canQuery,
        isLoading: inStall.isPending && active,
        isError: inStall.isError,
      }),
    [inStall.data, inStall.isPending, inStall.isError, hasMonitor, canQuery, active],
  );

  const readings = useMemo<HorseReading[]>(() => {
    const activenessPoint = singlePointReading(activeness.data);
    const temperaturePoint = metricPointReading(sensors.data, SENSOR_METRIC.temperature);
    const noisePoint = metricPointReading(sensors.data, SENSOR_METRIC.noise);

    const activenessDisplay = deriveScoreCardDisplay({
      value: activenessCategory(activenessPoint?.value),
      canQuery: active,
      isLoading: activeness.isPending && active,
      isError: activeness.isError,
      isLive,
      isOnline,
      cacheAgeMs: activeness.dataUpdatedAt ? Math.max(0, nowMillis - activeness.dataUpdatedAt) : undefined,
      horseIsOut: status === 'out-of-stall',
    });
    const temperatureDisplay = deriveScoreCardDisplay({
      value: formatTemperature(temperaturePoint?.value, isMetric),
      canQuery: active,
      isLoading: sensors.isPending && active,
      isError: sensors.isError,
      isLive,
      isOnline,
      cacheAgeMs: sensors.dataUpdatedAt ? Math.max(0, nowMillis - sensors.dataUpdatedAt) : undefined,
    });
    const noiseDisplay = deriveScoreCardDisplay({
      value: noiseCategory(noisePoint?.value),
      canQuery: active,
      isLoading: sensors.isPending && active,
      isError: sensors.isError,
      isLive,
      isOnline,
      cacheAgeMs: sensors.dataUpdatedAt ? Math.max(0, nowMillis - sensors.dataUpdatedAt) : undefined,
    });

    return [
      { label: 'Activeness', ...activenessDisplay },
      { label: 'Temperature', ...temperatureDisplay },
      { label: 'Noise Level', ...noiseDisplay },
    ];
  }, [
    active,
    activeness.data,
    activeness.dataUpdatedAt,
    activeness.isError,
    activeness.isPending,
    sensors.data,
    sensors.dataUpdatedAt,
    sensors.isError,
    sensors.isPending,
    isMetric,
    isLive,
    isOnline,
    nowMillis,
    status,
  ]);

  const { refetch: refetchInStall } = inStall;
  const { refetch: refetchSensors } = sensors;
  const { refetch: refetchActiveness } = activeness;

  const refetch = useCallback(async () => {
    await Promise.all([refetchInStall(), refetchSensors(), refetchActiveness()]);
  }, [refetchInStall, refetchSensors, refetchActiveness]);

  return {
    status,
    readings,
    hasMonitor,
    isLoading: active && (inStall.isPending || sensors.isPending || activeness.isPending),
    isError: inStall.isError || sensors.isError || activeness.isError,
    refetch,
  };
}
