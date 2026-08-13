/**
 * Device type codes.
 *
 * The current app's version also carries product photography for each device
 * (`require`d PNGs). Those belong with the screens that show hardware, not with
 * the codes; For You only needs to know which device types an organization has.
 */
export interface DeviceTypeInfo {
  type: number;
  name: string;
  title: string;
}

export const deviceTypes: DeviceTypeInfo[] = [
  { type: 1, name: 'smd', title: 'Stall Monitor' },
  { type: 5, name: 'intScale', title: 'Wireless Bucket Meter' },
  { type: 7, name: 'neuralCore', title: 'Neural Core' },
  { type: 4, name: 'distHub', title: 'Distribution Hub' },
  { type: 6, name: 'gateway', title: 'Gateway' },
];

export const deviceTypeMap: Record<string, DeviceTypeInfo> = Object.fromEntries(
  deviceTypes.map((d) => [d.name, d]),
);
