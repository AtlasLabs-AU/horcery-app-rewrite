import { createQueryKeys } from '@lukemorales/query-key-factory';

import { provisioningRequestService } from '../../api/stall-monitor-management/provisioning-request';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const provisioningRequest = createQueryKeys('provisioningRequest', {
  detail: (
    provisioningRequestId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'provisioningRequest',
      'fetch',
      provisioningRequestId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      provisioningRequestService.fetch(
        provisioningRequestId,
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
      'provisioningRequest',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      provisioningRequestService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'provisioningRequest',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      provisioningRequestService.fetchAll(
        { page: pageParam, ...filters },
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
      'provisioningRequest',
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
        const result = await provisioningRequestService.fetchAll(
          { page: currentPage, ...filters },
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
