import type { IEvent } from '@acme/services/api/event-management/event';

export interface IReviewCardDetailSlice {
  id: string | null;
  setId: (id: string) => void;
  event: IEvent | null;
  setEvent: (event: IEvent | null) => void;
  clearReviewCard: () => void;
}

export const createReviewCardDetailSlice = (
  set: (
    fn: (state: IReviewCardDetailSlice) => Partial<IReviewCardDetailSlice>,
  ) => void,
): IReviewCardDetailSlice => ({
  id: null,
  setId: (id: string) => set(() => ({ id })),
  event: null,
  setEvent: (event: IEvent | null) => set(() => ({ event })),
  clearReviewCard: () => set(() => ({ id: null, event: null })),
});
