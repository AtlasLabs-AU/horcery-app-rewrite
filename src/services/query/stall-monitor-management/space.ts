import { createQueryKeys } from '@lukemorales/query-key-factory';

import { spaceService } from '../../api/stall-monitor-management/space';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const space = createQueryKeys('space', {
  detail: (
    spaceId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'space',
      'fetch',
      spaceId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      spaceService.fetch(spaceId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'space',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => spaceService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'space',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      spaceService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
