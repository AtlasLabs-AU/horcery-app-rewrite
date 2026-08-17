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
import { firstPointValue, metricPointValue } from '@/services/prometheus/horse-readings';

/**
 * How often a live reading re-asks. The current app uses ten minutes for the
 * in-stall query; the same number here, but the query is also keyed by the
 * cursor, so moving the date bar re-reads at once rather than waiting.
 */
const LIVE_REFRESH_MS = 10 * 60 * 1000;

export interface HorseReading {
  label: string;
  value: string;
}

export interface HorseStatus {
  status: InStallStatus;
  readings: HorseReading[];
  /** Whether this stall has a monitor fitted at all — separate from `enabled`. */
  hasCamera: boolean;
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

  const prometheusUrl = stall?.prometheus_url;
  const hasCamera = !!prometheusUrl && !!stall?.current_stall_monitor_deviceinstance;
  const active = enabled && hasCamera;
  // Whole seconds: a millisecond-precision cursor would mint a new query key
  // on every render, so nothing would ever hit cache.
  const atSeconds = Math.floor(cursor.toSeconds());

  const inStall = useQuery({
    ...queries.prometheus.query(`${prometheusUrl}/`, ANIMAL_IN_STALL, [
      { key: 'time', value: `${atSeconds}` },
    ]),
    enabled: active,
    refetchInterval: LIVE_REFRESH_MS,
  });

  const sensors = useQuery({
    ...queries.prometheus.query(`${prometheusUrl}/`, STATISTICS_CARD_DATA, [
      { key: 'time', value: `${atSeconds}` },
    ]),
    enabled: active,
    refetchInterval: LIVE_REFRESH_MS,
  });

  const activeness = useQuery({
    ...queries.prometheus.query(`${prometheusUrl}/`, ACTIVENESS_STATISTICS_DATA, [
      { key: 'time', value: `${atSeconds}` },
      { key: 'step', value: '15' },
    ]),
    enabled: active,
    refetchInterval: LIVE_REFRESH_MS,
  });

  const status = useMemo(
    () =>
      deriveInStallStatus({
        value: firstPointValue(inStall.data),
        hasCamera,
        isLoading: inStall.isPending && active,
        isError: inStall.isError,
      }),
    [inStall.data, inStall.isPending, inStall.isError, hasCamera, active],
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
    hasCamera,
    isLoading: active && (inStall.isPending || sensors.isPending),
    isError: inStall.isError || sensors.isError,
    refetch,
  };
}
