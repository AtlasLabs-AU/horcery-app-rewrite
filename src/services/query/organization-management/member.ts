import { createQueryKeys } from '@lukemorales/query-key-factory';

import { memberService } from '../../api/organization-management/member';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const member = createQueryKeys('member', {
  detail: (
    memberId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'member',
      'fetch',
      memberId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      memberService.fetch(memberId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'member',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => memberService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'member',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      memberService.fetchAll(
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
      'organization-management',
      'member',
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
        const result = await memberService.fetchAll(
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
