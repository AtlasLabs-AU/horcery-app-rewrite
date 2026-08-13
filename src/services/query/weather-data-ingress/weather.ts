import { createQueryKeys } from '@lukemorales/query-key-factory';

import { weatherService } from '../../api/weather-data-ingress/weather';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const weather = createQueryKeys('Weather', {
  detail: (
    WeatherId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'weather-data-ingress',
      'Weather',
      'fetch',
      WeatherId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      weatherService.fetch(WeatherId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'weather-data-ingress',
      'Weather',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => weatherService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'weather-data-ingress',
      'Weather',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      weatherService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
