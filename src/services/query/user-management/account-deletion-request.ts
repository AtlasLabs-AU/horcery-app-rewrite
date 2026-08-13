import { createQueryKeys } from '@lukemorales/query-key-factory';

import { accountDeletionRequestService } from '../../api/user-management/account-deletion-request';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const accountDeletionRequest = createQueryKeys(
  'accountDeletionRequest',
  {
    detail: (
      accountDeletionRequestId: string,
      filters?: IFilterSortParams,
      additionalParams?: IAdditionalParam[],
      query?: string[],
    ) => ({
      queryKey: [
        'user-management',
        'accountDeletionRequest',
        'fetch',
        accountDeletionRequestId,
        filters,
        additionalParams,
        query,
      ],
      queryFn: () =>
        accountDeletionRequestService.fetch(
          accountDeletionRequestId,
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
        'user-management',
        'accountDeletionRequest',
        'fetchAll',
        filters,
        additionalParams,
        query,
      ],
      queryFn: () =>
        accountDeletionRequestService.fetchAll(
          filters,
          additionalParams,
          query,
        ),
    }),
    infiniteList: (
      filters?: IFilterSortParams,
      additionalParams?: IAdditionalParam[],
      query?: string[],
    ) => ({
      queryKey: [
        'user-management',
        'accountDeletionRequest',
        'fetchInfinite',
        filters,
        additionalParams,
        query,
      ],
      queryFn: ({ pageParam }: { pageParam: number }) =>
        accountDeletionRequestService.fetchAll(
          { page: pageParam, ...filters },
          additionalParams,
          query,
        ),
    }),
  },
);
