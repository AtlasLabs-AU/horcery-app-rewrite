import { createQueryKeys } from '@lukemorales/query-key-factory';

import { deviceInstanceService } from '../../api/stall-monitor-management/device-instance';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const deviceInstance = createQueryKeys('deviceInstance', {
  detail: (
    deviceInstanceId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'deviceInstance',
      'fetch',
      deviceInstanceId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      deviceInstanceService.fetch(
        deviceInstanceId,
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
      'deviceInstance',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      deviceInstanceService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'deviceInstance',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      deviceInstanceService.fetchAll(
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
      'deviceInstance',
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
        // fetch current page data
        const result = await deviceInstanceService.fetchAll(
          // `page` last: a caller-supplied `filters.page` would otherwise pin
        // every iteration to the same page and loop over identical rows.
        { ...filters, page: currentPage },
          additionalParams,
          query,
        );

        // get page data and page count
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
