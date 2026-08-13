import { create } from 'zustand';
import { computed } from 'zustand-computed-state';

import type { AnimalStallDetailSlice } from '../utils/animal-stall-detail-slice';
import type { PlayHeadStateSlice } from '../utils/play-head-state-slice';
import { createAnimalStallDetailSlice } from '../utils/animal-stall-detail-slice';
import { createPlayHeadStateSlice } from '../utils/play-head-state-slice';

type IAnimalDetailState = PlayHeadStateSlice & AnimalStallDetailSlice;

export const useAnimalDetailStore = create<IAnimalDetailState>()(
  computed((set, get) => ({
    ...createAnimalStallDetailSlice(set),
    ...createPlayHeadStateSlice(set, get),
  })),
);
