import { createQueryKeys } from '@lukemorales/query-key-factory';

import { animalStallService } from '../../api/stall-monitor-management/animal-stall';
import type { IAnimalStall } from '../../api/stall-monitor-management/animal-stall';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const animalStall = createQueryKeys('animalStall', {
  detail: (
    animalStallId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'animalStall',
      'fetch',
      animalStallId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalStallService.fetch(animalStallId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'animalStall',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalStallService.fetchAll(filters, additionalParams, query),
  }),
  listComplete: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'animalStall',
      'fetchComplete',
      filters,
      additionalParams,
      query,
    ] as const,
    queryFn: async () => {
      const allItems: IAnimalStall[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const result = await animalStallService.fetchAll(
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
