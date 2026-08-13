import { createQueryKeys } from '@lukemorales/query-key-factory';

import { stallAdjustmentCheckService } from '../../api/stall-monitor-management/stall-adjustment-check';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const stallAdjustmentCheck = createQueryKeys('stallAdjustmentCheck', {
  detail: (
    stallAdjustmentCheckId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stallAdjustmentCheck',
      'fetch',
      stallAdjustmentCheckId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      stallAdjustmentCheckService.fetch(
        stallAdjustmentCheckId,
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
      'stall-monitor-management',
      'stallAdjustmentCheck',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      stallAdjustmentCheckService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stallAdjustmentCheck',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      stallAdjustmentCheckService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
