import { createQueryKeys } from '@lukemorales/query-key-factory';

import { animalDeviceInstanceService } from '../../api/stall-monitor-management/animal-device-instance';
import {
  IAdditionalParam,
  IFilterSortParams,
} from '../../base/generic-interfaces';

export const animalDeviceInstance = createQueryKeys('animalDeviceInstance', {
  detail: (
    animalDeviceInstanceId: string,
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'animalDeviceInstance',
      'fetch',
      animalDeviceInstanceId,
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalDeviceInstanceService.fetch(
        animalDeviceInstanceId,
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
      'animalDeviceInstance',
      'fetchAll',
      filters,
      additionalParams,
      query,
    ],
    queryFn: () =>
      animalDeviceInstanceService.fetchAll(filters, additionalParams, query),
  }),
  infiniteList: (
    filters?: IFilterSortParams,
    additionalParams?: IAdditionalParam[],
    query?: string[],
  ) => ({
    queryKey: [
      'stall-monitor-management',
      'animalDeviceInstance',
      'fetchInfinite',
      filters,
      additionalParams,
      query,
    ],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      animalDeviceInstanceService.fetchAll(
        { ...filters, page: pageParam },
        additionalParams,
        query,
      ),
  }),
});
