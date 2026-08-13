import type { ISpace } from '@acme/services/api/stall-monitor-management/space';

export interface SpaceDetailSlice {
  id: string | null;
  setId: (id: string) => void;
  space: ISpace | null;
  setSpace: (s: ISpace | null) => void;
}

export const createSpaceDetailSlice = (
  set: (fn: (state: SpaceDetailSlice) => Partial<SpaceDetailSlice>) => void,
): SpaceDetailSlice => ({
  id: null,
  setId: (id: string) => set(() => ({ id })),
  space: {} as ISpace,
  setSpace: (space: ISpace | null) => set(() => ({ space })),
});
