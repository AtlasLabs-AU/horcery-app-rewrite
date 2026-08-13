import { createQueryKeys } from '@lukemorales/query-key-factory';

import { resendVerifyEmailService } from '../../api/user-management/resend-verify-email';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const resendVerifyEmail = createQueryKeys('resendVerifyEmail', {
  detail: (
    resendVerifyEmailId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'resendVerifyEmail',
      'fetch',
      resendVerifyEmailId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      resendVerifyEmailService.fetch(
        resendVerifyEmailId,
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
      'resendVerifyEmail',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      resendVerifyEmailService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'user-management',
      'resendVerifyEmail',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      resendVerifyEmailService.fetchAll(
        { page: pageParam, ...filters },
        additionalParams,
        query,
      ),
  }),
});
