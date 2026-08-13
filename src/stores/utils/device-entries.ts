export type DeviceEntry = [string, string];

const DELETED_DEVICE_LABEL_PREFIX = 'Deleted Device';

export const buildDeviceEntries = (
  uniqueDeviceIds: string[],
  deviceInstanceMap: Map<string, string>,
): DeviceEntry[] => {
  let deletedDeviceCount = 0;

  return uniqueDeviceIds.map((id) => {
    const deviceName = deviceInstanceMap.get(id);

    if (deviceName) {
      return [id, deviceName];
    }

    deletedDeviceCount += 1;
    return [id, `${DELETED_DEVICE_LABEL_PREFIX} ${deletedDeviceCount}`];
  });
};
