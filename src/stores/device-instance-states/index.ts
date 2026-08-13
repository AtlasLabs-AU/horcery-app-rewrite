import { create } from 'zustand';

import type { IDeviceInstance } from '@acme/services/api/stall-monitor-management/device-instance';

interface IDeviceInstanceState {
  id: string | null;
  setId: (id: string) => void;
  deviceInstance: IDeviceInstance | null;
  setDeviceInstance: (deviceInstance: IDeviceInstance | null) => void;
}

export const useDeviceInstanceStore = create<IDeviceInstanceState>((set) => ({
  id: null,
  setId: (id: string) => set(() => ({ id })),
  setDeviceInstance: (deviceInstance: IDeviceInstance | null) =>
    set(() => ({ deviceInstance })),
  deviceInstance: {} as IDeviceInstance,
}));
