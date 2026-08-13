import { createQueryKeys } from '@lukemorales/query-key-factory';

import { federatedPrometheusService } from '../../api/federated-prometheus-management/federated-prometheus';
import { IAdditionalParam } from '../../base/generic-interfaces';

const QUERY_ENDPOINT = 'query';
const QUERY_RANGE_ENDPOINT = 'query_range';

export const federatedPrometheus = createQueryKeys('federatedPrometheus', {
  query: (
    prometheusQuery?: string,
    additionalParams?: IAdditionalParam[],
    organizationID?: string,
  ) => ({
    queryKey: [
      'federated-prometheus-service',
      'federated-prometheus',
      'fetchQuery',
      prometheusQuery,
      additionalParams,
      organizationID,
    ],
    queryFn: () =>
      federatedPrometheusService.fetch(
        QUERY_ENDPOINT,
        prometheusQuery,
        additionalParams,
        organizationID,
      ),
  }),
  queryRange: (
    prometheusQuery?: string,
    additionalParams?: IAdditionalParam[],
    organizationID?: string,
  ) => ({
    queryKey: [
      'federated-prometheus-service',
      'federated-prometheus',
      'fetchQueryRange',
      prometheusQuery,
      additionalParams,
      organizationID,
    ],
    queryFn: () =>
      federatedPrometheusService.fetch(
        QUERY_RANGE_ENDPOINT,
        prometheusQuery,
        additionalParams,
        organizationID,
      ),
  }),
});
