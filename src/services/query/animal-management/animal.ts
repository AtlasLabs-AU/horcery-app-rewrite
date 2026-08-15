import { createQueryKeys } from '@lukemorales/query-key-factory';

import { animalService } from '../../api/animal-management/animal';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const animal = createQueryKeys('animal', {
  detail: (
    animalId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'animal-management',
      'animal',
      'fetch',
      animalId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalService.fetch(animalId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'animal-management',
      'animal',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => animalService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'user',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      animalService.fetchAll(
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
      'animal-management',
      'animal',
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
        const result = await animalService.fetchAll(
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
