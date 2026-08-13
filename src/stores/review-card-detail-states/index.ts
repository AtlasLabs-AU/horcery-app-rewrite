import { create } from 'zustand';

import type { IReviewCardDetailSlice } from '../utils/review-card-detail-slice';
import { createReviewCardDetailSlice } from '../utils/review-card-detail-slice';

export const useReviewCardDetailStore = create<IReviewCardDetailSlice>()(
  (set) => ({
    ...createReviewCardDetailSlice(set),
  }),
);
