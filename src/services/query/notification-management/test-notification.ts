import { createQueryKeys } from '@lukemorales/query-key-factory';

import { testNotificationService } from '../../api/notification-management/test-notification';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const testNotification = createQueryKeys('testNotification', {
  detail: (
    testNotificationId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'notification-management',
      'testNotification',
      'fetch',
      testNotificationId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      testNotificationService.fetch(
        testNotificationId,
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
      'testNotification',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      testNotificationService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'notification-management',
      'testNotification',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      testNotificationService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
