import { createQueryKeys } from '@lukemorales/query-key-factory';

import { alertRuleService } from '../../api/alert-management/alert-rule';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const alertRule = createQueryKeys('alertRule', {
  detail: (
    alertRuleId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'alertRule',
      'fetch',
      alertRuleId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      alertRuleService.fetch(alertRuleId, filters, additionalParams, query),
  }),
  list: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'alertRule',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () => alertRuleService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'alert-management',
      'alertRule',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      alertRuleService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
