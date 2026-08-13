import { createQueryKeys } from '@lukemorales/query-key-factory';

import { userService } from '../../api/user-management/user';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const user = createQueryKeys('user', {
  detail: (
    userId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'user',
      'fetch',
      userId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => userService.fetch(userId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'user',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => userService.fetchAll(filters, additionalParams, query),
  }),
});
