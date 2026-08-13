import { IClip } from '@acme/services/api/clip-management/clip';

export interface IClipDetailSlice {
  id: string | null;
  setId: (id: string) => void;
  clip: IClip | null;
  setClip: (clip: IClip | null) => void;
  clearClipDetails: () => void;
}

export const createClipDetailSlice = (
  set: (fn: (state: IClipDetailSlice) => Partial<IClipDetailSlice>) => void,
  get: () => Partial<IClipDetailSlice>,
): IClipDetailSlice => ({
  id: null,
  setId: (id: string) => set(() => ({ id })),
  clip: null,
  setClip: (clip: IClip | null) => set(() => ({ clip })),
  clearClipDetails: () => set(() => ({ id: null, clip: null })),
});
