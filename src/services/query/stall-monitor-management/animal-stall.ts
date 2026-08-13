import { createQueryKeys } from '@lukemorales/query-key-factory';

import { animalStallService } from '../../api/stall-monitor-management/animal-stall';
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
});
