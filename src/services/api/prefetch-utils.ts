import { apiWithTimeout } from '@acme/config/utils/api-utils';

import { queries, queryClient } from '../index';

/**
 * Centralized prefetch utility for detail pages
 * Handles all the necessary prefetches for smooth navigation to detail pages
 */

export interface PrefetchOptions {
  organizationID?: string;
  staleTime?: number;
  currentPath?: string;
}

const DEFAULT_STALE_TIME = 2 * 60_000; // 2 minutes

/**
 * Prefetch animal detail data
 */
export const prefetchAnimalDetails = async (
  animalId: string,
  options: PrefetchOptions = {},
) => {
  if (!animalId) return;
  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  return apiWithTimeout(
    queryClient.prefetchQuery({
      ...queries.animal.detail(animalId, {
        deleted_at__isnull: true,
        organization_id: organizationID ?? '',
      }),
      staleTime,
    }),
  );
};

/**
 * Prefetch stall detail data
 */
export const prefetchStallDetails = async (
  stallId: string,
  options: PrefetchOptions = {},
) => {
  if (!stallId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  return apiWithTimeout(
    queryClient.prefetchQuery({
      ...queries.stall.detail(stallId, {
        deleted_at__isnull: true,
        organization_id: organizationID ?? '',
        include: 'current_stall_monitor_deviceinstance,animal_stalls',
      }),
      staleTime,
    }),
  );
};

/**
 * Prefetch space detail data
 */
export const prefetchSpaceDetails = async (
  spaceId: string,
  options: PrefetchOptions = {},
) => {
  if (!spaceId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  return apiWithTimeout(
    queryClient.prefetchQuery({
      ...queries.space.detail(spaceId, {
        deleted_at__isnull: true,
        organization_id: organizationID ?? '',
      }),
      staleTime,
    }),
  );
};

/**
 * Prefetch device instance detail data
 */
export const prefetchDeviceInstanceDetails = async (
  deviceInstanceId: string,
  deviceType?: number,
  options: PrefetchOptions = {},
) => {
  if (!deviceInstanceId) return;

  const { staleTime = DEFAULT_STALE_TIME } = options;

  // Include parent device instance if not a gateway device
  const include = ['stall.animal_stalls'];
  if (deviceType !== 6) {
    // gateway device type
    include.push('parent_device_instance');
  }

  return apiWithTimeout(
    queryClient.prefetchQuery({
      ...queries.deviceInstance.detail(deviceInstanceId, {
        include: include.join(','),
      }),
      staleTime,
    }),
  );
};

/**
 * Prefetch animal-stall relationship data
 */
export const prefetchAnimalStalls = async (
  animalId: string,
  options: PrefetchOptions = {},
) => {
  if (!animalId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  return apiWithTimeout(
    queryClient.prefetchQuery({
      ...queries.animalStall.list(
        {
          deleted_at__isnull: true,
          organization_id: organizationID ?? '',
          include: 'stall',
        },
        [{ key: 'animal_id', value: animalId }],
      ),
      staleTime,
    }),
  );
};

/**
 * Prefetch stall-animal relationship data
 */
export const prefetchStallAnimals = async (
  stallId: string,
  options: PrefetchOptions = {},
) => {
  if (!stallId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  return apiWithTimeout(
    queryClient.prefetchQuery({
      ...queries.animalStall.list(
        {
          deleted_at__isnull: true,
          organization_id: organizationID ?? '',
        },
        [{ key: 'stall', value: stallId }],
      ),
      staleTime,
    }),
  );
};

/**
 * Comprehensive prefetch for animal detail page
 */
export const prefetchAnimalDetailPage = async (
  animalId: string,
  options: PrefetchOptions = {},
) => {
  if (!animalId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  const prefetchPromises = [
    prefetchAnimalDetails(animalId, {
      organizationID,
      staleTime,
      currentPath: options.currentPath,
    }),
    prefetchAnimalStalls(animalId, {
      organizationID,
      staleTime,
      currentPath: options.currentPath,
    }),
  ];

  return Promise.all(prefetchPromises);
};

/**
 * Comprehensive prefetch for stall detail page
 */
export const prefetchStallDetailPage = async (
  stallId: string,
  options: PrefetchOptions = {},
) => {
  if (!stallId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  const prefetchPromises = [
    prefetchStallDetails(stallId, {
      organizationID,
      staleTime,
      currentPath: options.currentPath,
    }),
    prefetchStallAnimals(stallId, {
      organizationID,
      staleTime,
      currentPath: options.currentPath,
    }),
  ];

  return Promise.all(prefetchPromises);
};

/**
 * Comprehensive prefetch for space detail page
 */
export const prefetchSpaceDetailPage = async (
  spaceId: string,
  options: PrefetchOptions = {},
) => {
  if (!spaceId) return;

  const { organizationID, staleTime = DEFAULT_STALE_TIME } = options;

  const prefetchPromises = [
    prefetchSpaceDetails(spaceId, {
      organizationID,
      staleTime,
      currentPath: options.currentPath,
    }),
  ];

  // If we have organizationID, also prefetch space groups
  if (organizationID) {
    prefetchPromises.push(
      apiWithTimeout(
        queryClient.prefetchQuery({
          ...queries.spaceGroup.list({
            deleted_at__isnull: true,
            organization_id: organizationID,
          }),
          staleTime,
        }),
      ),
    );
  }

  return Promise.all(prefetchPromises);
};

/**
 * Comprehensive prefetch for device detail page
 */
export const prefetchDeviceDetailPage = async (
  deviceInstanceId: string,
  deviceType?: number,
  options: PrefetchOptions = {},
) => {
  if (!deviceInstanceId) return;

  const { staleTime = DEFAULT_STALE_TIME } = options;

  return prefetchDeviceInstanceDetails(deviceInstanceId, deviceType, {
    staleTime,
    currentPath: options.currentPath,
  });
};

/**
 * Main prefetch function that handles all detail page types
 */
export const prefetchDetailPage = async (
  type: 'animal' | 'stall' | 'space' | 'device',
  id: string,
  options: PrefetchOptions & { deviceType?: number } = {},
) => {
  const { deviceType, ...prefetchOptions } = options;

  switch (type) {
    case 'animal':
      try {
        return await prefetchAnimalDetailPage(id, prefetchOptions);
      } catch (error) {
        console.log('Animal prefetch failed: ', (error as Error).message);
        return;
      }
    case 'stall':
      try {
        return await prefetchStallDetailPage(id, prefetchOptions);
      } catch (error) {
        console.log('Stall prefetch failed: ', (error as Error).message);
        return;
      }
    case 'space':
      try {
        return await prefetchSpaceDetailPage(id, prefetchOptions);
      } catch (error) {
        console.log('Space prefetch failed: ', (error as Error).message);
        return;
      }
    case 'device':
      try {
        return await prefetchDeviceDetailPage(id, deviceType, prefetchOptions);
      } catch (error) {
        console.log('Device prefetch failed: ', (error as Error).message);
        return;
      }
    default:
      throw new Error(`Unknown detail page type: ${type}`);
  }
};
