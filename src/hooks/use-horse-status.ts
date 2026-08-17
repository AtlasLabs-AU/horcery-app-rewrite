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
  deriveInStallStatus,
  formatTemperature,
  noiseCategory,
  type InStallStatus,
} from '@/hooks/horse-status-data';
import { stallHasMetrics, stallHasMonitor } from '@/hooks/horses-data';
import { liveSliceFor } from '@/hooks/playhead-data';
import { firstPointValue, metricPointValue } from '@/services/prometheus/horse-readings';


export interface HorseReading {
  label: string;
  value: string;
}

export interface HorseStatus {
  status: InStallStatus;
  readings: HorseReading[];
  /** Whether a stall monitor is fitted at all — separate from `enabled`. */
  hasMonitor: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
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
  enabled = true,
}: {
  stall: IStall | undefined;
  cursor: DateTime;
  enabled?: boolean;
}): HorseStatus {
  const isMetric = useAuthStore((s) => s.userPreferences?.isMetric ?? true);

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
      { key: 'step', value: '15' },
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
    if (!active) return [];
    const rows: HorseReading[] = [];

    const activenessLabel = activenessCategory(firstPointValue(activeness.data));
    if (activenessLabel) rows.push({ label: 'Activeness', value: activenessLabel });

    const temperature = formatTemperature(
      metricPointValue(sensors.data, SENSOR_METRIC.temperature),
      isMetric,
    );
    if (temperature) rows.push({ label: 'Temperature', value: temperature });

    const noise = noiseCategory(metricPointValue(sensors.data, SENSOR_METRIC.noise));
    if (noise) rows.push({ label: 'Noise', value: noise });

    const humidity = metricPointValue(sensors.data, SENSOR_METRIC.humidity);
    if (humidity != null) rows.push({ label: 'Humidity', value: `${Math.round(humidity)}%` });

    return rows;
  }, [active, activeness.data, sensors.data, isMetric]);

  const { refetch: refetchInStall } = inStall;
  const { refetch: refetchSensors } = sensors;
  const { refetch: refetchActiveness } = activeness;

  const refetch = useCallback(() => {
    void refetchInStall();
    void refetchSensors();
    void refetchActiveness();
  }, [refetchInStall, refetchSensors, refetchActiveness]);

  return {
    status,
    readings,
    hasMonitor,
    isLoading: active && (inStall.isPending || sensors.isPending),
    isError: inStall.isError || sensors.isError,
    refetch,
  };
}
