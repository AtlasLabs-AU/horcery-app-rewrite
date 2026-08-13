import { create } from 'zustand';
import { computed } from 'zustand-computed-state';

import type { SpaceDetailSlice } from '../utils/space-detail-slice';
import {
  createPlayHeadStateSlice,
  PlayHeadStateSlice,
} from '../utils/play-head-state-slice';
import { createSpaceDetailSlice } from '../utils/space-detail-slice';

type SpaceDetailState = PlayHeadStateSlice & SpaceDetailSlice;

export const useSpaceDetailStore = create<SpaceDetailState>()(
  computed((set, get) => ({
    ...createSpaceDetailSlice(set),
    ...createPlayHeadStateSlice(set, get),
  })),
);
