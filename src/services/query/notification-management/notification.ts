import { createQueryKeys } from '@lukemorales/query-key-factory';

import { notificationService } from '../../api/notification-management/notification';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const notification = createQueryKeys('notification', {
  detail: (
    notificationId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'notification-management',
      'notification',
      'fetch',
      notificationId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      notificationService.fetch(
        notificationId,
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
      'notification-management',
      'notification',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      notificationService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'notification-management',
      'notification',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      notificationService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
