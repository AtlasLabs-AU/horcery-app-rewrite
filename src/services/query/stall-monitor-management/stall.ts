import { createQueryKeys } from '@lukemorales/query-key-factory';

import { stallService } from '../../api/stall-monitor-management/stall';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const stall = createQueryKeys('stall', {
  detail: (
    stallId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stall',
      'fetch',
      stallId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      stallService.fetch(stallId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stall',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => stallService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stall',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      stallService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
  listComplete: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'stall',
      'fetchComplete',
      filters,
      additionalParams,
      query,
    ] as const,
    queryFn: async () => {
      const allItems: any[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const result = await stallService.fetchAll(
          { ...filters, page: currentPage },
          additionalParams,
          query,
        );
        const pageData = (result.data as any[]) ?? [];
        const pageCount = result.meta?.page_count ?? 1;

        allItems.push(...pageData);
        totalPages = pageCount;
        currentPage++;
      } while (currentPage <= totalPages);

      return allItems;
    },
  }),
});
