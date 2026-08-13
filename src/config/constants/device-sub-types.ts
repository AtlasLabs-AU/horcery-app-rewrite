/**
 * Device sub-type codes.
 *
 * The current app's version of this file also carries the SVG artwork for each
 * sub-type. Only the numeric codes are needed to answer "does this org have
 * feed/water scales", so the artwork is left behind — importing it would drag
 * react-native-svg and the asset pipeline in for two integers.
 */
export interface DeviceSubTypeInfo {
  type: number;
  name: string;
  title: string;
}

export const deviceSubTypes: DeviceSubTypeInfo[] = [
  { type: 1, name: 'feed', title: 'Feed' },
  { type: 2, name: 'water', title: 'Water' },
];

export const deviceSubTypeMap: Record<string, DeviceSubTypeInfo> =
  Object.fromEntries(deviceSubTypes.map((d) => [d.name, d]));
