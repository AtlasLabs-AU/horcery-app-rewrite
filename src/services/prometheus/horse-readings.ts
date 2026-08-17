import type {
  IPrometheus,
  IQuery,
} from '@acme/services/api/prometheus-management/prometheus';
import type { IGenericResponse } from '@acme/services/base/generic-interfaces';

/**
 * The one place a Prometheus instant-query response is read.
 *
 * Lives under `src/services/` because it is the only zone allowed to import
 * `services/api/prometheus-management` (`eslint.config.js`'s METRICS_INTERNALS
 * boundary, requirements §6a: "feature screens never author PromQL or see a
 * Prometheus URL"). `src/hooks/use-horse-status.ts` calls these functions and
 * never names `IPrometheus`/`IQuery` itself — the raw shape stops here.
 */

function toNumber(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** The value of an instant query's first (and usually only) result. */
export function firstPointValue(
  response: IGenericResponse<IPrometheus> | undefined,
): number | undefined {
  const result = response?.data?.result?.[0] as IQuery | undefined;
  return toNumber(result?.value?.[1]);
}

/**
 * One named series out of a multi-metric response, matched by `__name__`.
 * The sensor bundle query returns temperature, humidity, noise and light in
 * one call; this is how the caller picks one back out.
 */
export function metricPointValue(
  response: IGenericResponse<IPrometheus> | undefined,
  metricName: string,
): number | undefined {
  const results = (response?.data?.result ?? []) as IQuery[];
  return toNumber(results.find((item) => item.metric?.__name__ === metricName)?.value?.[1]);
}
