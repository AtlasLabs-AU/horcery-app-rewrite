import { createQueryKeys } from '@lukemorales/query-key-factory';

import { animalGroupService } from '../../api/animal-management/animal-group';
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
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
