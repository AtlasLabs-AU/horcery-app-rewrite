import { createQueryKeys } from '@lukemorales/query-key-factory';

import { contactService } from '../../api/organization-management/contact';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const contact = createQueryKeys('contact', {
  detail: (
    contactId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'contact',
      'fetch',
      contactId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      contactService.fetch(contactId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'contact',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => contactService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'organization-management',
      'contact',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      contactService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
