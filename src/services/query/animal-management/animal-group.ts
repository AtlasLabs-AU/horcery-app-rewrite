import { createQueryKeys } from '@lukemorales/query-key-factory';

import { animalGroupService } from '../../api/animal-management/animal-group';
import type { IAnimalGroup } from '../../api/animal-management/animal-group';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const animalGroup = createQueryKeys('animalGroup', {
  detail: (
    animalGroupId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'animal-management',
      'animalGroup',
      'fetch',
      animalGroupId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalGroupService.fetch(animalGroupId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'animal-management',
      'animalGroup',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalGroupService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'animal-management',
      'animalGroup',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      animalGroupService.fetchAll(
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
      'animalGroup',
      'fetchComplete',
      filters,
      additionalParams,
      query,
    ] as const,
    queryFn: async () => {
      const allItems: IAnimalGroup[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const result = await animalGroupService.fetchAll(
          { ...filters, page: currentPage },
          additionalParams,
          query,
        );
        allItems.push(...(result.data ?? []));
        totalPages = result.meta?.page_count ?? 1;
        currentPage += 1;
      } while (currentPage <= totalPages);

      return allItems;
    },
  }),
});
