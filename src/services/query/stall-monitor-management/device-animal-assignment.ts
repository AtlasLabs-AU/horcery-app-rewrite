import { createQueryKeys } from '@lukemorales/query-key-factory';

import { deviceAnimalAssignmentService } from '../../api/stall-monitor-management/device-animal-assignment';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const deviceAnimalAssignment = createQueryKeys(
  'deviceAnimalAssignment',
  {
    detail: (
      deviceAnimalAssignmentId: string,
      filters?: IFilterSortParams,
      additionalParams?: IAdditionalParam[],
      query?: string[],
    ) => ({
      queryKey: [
        'stall-monitor-management',
        'deviceAnimalAssignment',
        'fetch',
        deviceAnimalAssignmentId,
        filters,
        additionalParams,
        query,
      ],
      queryFn: () =>
        deviceAnimalAssignmentService.fetch(
          deviceAnimalAssignmentId,
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
        'deviceAnimalAssignment',
        'fetchAll',
        filters,
        additionalParams,
        query,
      ],
      queryFn: () =>
        deviceAnimalAssignmentService.fetchAll(
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
        'stall-monitor-management',
        'deviceAnimalAssignment',
        'fetchInfinite',
        filters,
        additionalParams,
        query,
      ],
      queryFn: ({ pageParam }: { pageParam: number }) =>
        deviceAnimalAssignmentService.fetchAll(
          { ...filters, page: pageParam },
          additionalParams,
          query,
        ),
    }),
  },
);
