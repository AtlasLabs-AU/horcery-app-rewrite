import { createQueryKeys } from '@lukemorales/query-key-factory';

import { organizationService } from '../../api/organization-management/organization';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const organization = createQueryKeys('organization', {
  detail: (
    organizationId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'organization',
      'fetch',
      organizationId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      organizationService.fetch(
        organizationId,
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
      'organization-management',
      'organization',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      organizationService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'organization',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      organizationService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
