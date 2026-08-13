import { createQueryKeys } from '@lukemorales/query-key-factory';

import { userForgotPasswordService } from '../../api/user-management/user-forgot-password';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const userForgotPassword = createQueryKeys('userForgotPassword', {
  detail: (
    userForgotPasswordId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'userForgotPassword',
      'fetch',
      userForgotPasswordId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      userForgotPasswordService.fetch(
        userForgotPasswordId,
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
      'userForgotPassword',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      userForgotPasswordService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'userForgotPassword',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      userForgotPasswordService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
