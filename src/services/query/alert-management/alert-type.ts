import { createQueryKeys } from '@lukemorales/query-key-factory';

import { alertTypeService } from '../../api/alert-management/alert-type';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const alertType = createQueryKeys('alertType', {
  detail: (
    alertTypeId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'alertType',
      'fetch',
      alertTypeId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      alertTypeService.fetch(alertTypeId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'alertType',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => alertTypeService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'alertType',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      alertTypeService.fetchAll(
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
      'alert-management',
      'alertType',
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
        const result = await alertTypeService.fetchAll(
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

