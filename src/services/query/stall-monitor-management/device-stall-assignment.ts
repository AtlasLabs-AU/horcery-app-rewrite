import { createQueryKeys } from '@lukemorales/query-key-factory';

import { deviceStallAssignmentService } from '../../api/stall-monitor-management/device-stall-assignment';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const deviceStallAssignment = createQueryKeys('deviceStallAssignment', {
  detail: (
    deviceStallAssignmentId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'deviceStallAssignment',
      'fetch',
      deviceStallAssignmentId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      deviceStallAssignmentService.fetch(
        deviceStallAssignmentId,
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
      'stall-monitor-management',
      'deviceStallAssignment',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      deviceStallAssignmentService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'deviceStallAssignment',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      deviceStallAssignmentService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
