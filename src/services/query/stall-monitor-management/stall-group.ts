import { createQueryKeys } from '@lukemorales/query-key-factory';

import { stallGroupService } from '../../api/stall-monitor-management/stall-group';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const stallGroup = createQueryKeys('stallGroup', {
  detail: (
    stallGroupId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stallGroup',
      'fetch',
      stallGroupId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      stallGroupService.fetch(stallGroupId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stallGroup',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => stallGroupService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stallGroup',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      stallGroupService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
