import { createQueryKeys } from '@lukemorales/query-key-factory';

import { prometheusService } from '../../api/prometheus-management/prometheus';
import { IAdditionalParam } from '../../base/generic-interfaces';

export const prometheus = createQueryKeys('prometheus', {
  query: (
    prometheusUrl: string,
    prometheusQuery?: string,
    additionalParams?: IAdditionalParam[],
  ) => ({
    queryKey: [
      'prometheus-service',
      'prometheus',
      'fetchQuery',
      prometheusUrl,
      prometheusQuery,
      additionalParams,
    ],
    queryFn: ({ signal }) =>
      prometheusService.fetch(
        prometheusUrl,
        'api/v1/query',
        prometheusQuery,
        additionalParams,
        signal,
      ),
  }),
  queryRange: (
    prometheusUrl: string,
    prometheusQuery?: string,
    additionalParams?: IAdditionalParam[],
  ) => ({
    queryKey: [
      'prometheus-service',
      'prometheus',
      'fetchQueryRange',
      prometheusUrl,
      prometheusQuery,
      additionalParams,
    ],
    queryFn: ({ signal }) =>
      prometheusService.fetch(
        prometheusUrl,
        'api/v1/query_range',
        prometheusQuery,
        additionalParams,
        signal,
      ),
  }),
});
