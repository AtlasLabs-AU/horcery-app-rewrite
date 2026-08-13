import { createQueryKeys } from '@lukemorales/query-key-factory';

import { spaceGroupService } from '../../api/stall-monitor-management/space-group';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const spaceGroup = createQueryKeys('spaceGroup', {
  detail: (
    spaceGroupId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'spaceGroup',
      'fetch',
      spaceGroupId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      spaceGroupService.fetch(spaceGroupId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'spaceGroup',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => spaceGroupService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'spaceGroup',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      spaceGroupService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
