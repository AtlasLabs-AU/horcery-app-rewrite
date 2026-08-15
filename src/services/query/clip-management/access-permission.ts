import { createQueryKeys } from '@lukemorales/query-key-factory';

import { accessPermissionService } from '../../api/clip-management/access-permission';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const accessPermission = createQueryKeys('accessPermission', {
  detail: (
    accessPermissionId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'clip-management',
      'accessPermission',
      'fetch',
      accessPermissionId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      accessPermissionService.fetch(
        accessPermissionId,
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
      'clip-management',
      'accessPermission',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      accessPermissionService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'clip-management',
      'accessPermission',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      accessPermissionService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
