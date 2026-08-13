import { createQueryKeys } from '@lukemorales/query-key-factory';

import { suggestedAlertService } from '../../api/alert-management/suggested-alert';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const suggestedAlert = createQueryKeys('suggestedAlert', {
  detail: (
    suggestedAlertId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'suggestedAlert',
      'fetch',
      suggestedAlertId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      suggestedAlertService.fetch(
        suggestedAlertId,
        filters,
        additionalParams,
        query,
      ),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'suggestedAlert',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      suggestedAlertService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'suggestedAlert',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      suggestedAlertService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
