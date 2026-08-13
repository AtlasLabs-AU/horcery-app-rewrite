import { create } from 'zustand';

import type { IClipDetailSlice } from '../utils/clip-detail-slice';
import { createClipDetailSlice } from '../utils/clip-detail-slice';
import {
  createDownloadClipSlice,
  IDownloadClipSlice,
} from '../utils/download-clip-slice';

type IClipDetailState = IClipDetailSlice & IDownloadClipSlice;

export const useClipDetailStore = create<IClipDetailState>((set, get) => ({
  ...createClipDetailSlice(set, get),
  ...createDownloadClipSlice(set, get),
}));
