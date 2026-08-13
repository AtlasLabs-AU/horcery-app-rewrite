import { createQueryKeys } from '@lukemorales/query-key-factory';

import { locationService } from '../../api/organization-management/location';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const location = createQueryKeys('location', {
  detail: (
    locationId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'location',
      'fetch',
      locationId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      locationService.fetch(locationId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'location',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => locationService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'location',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      locationService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
