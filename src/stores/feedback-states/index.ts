import { create } from 'zustand';

interface FeedbackState {
  showFeedbackCard: boolean;
  setShowFeedbackCard: (show: boolean) => void;
  resetFeedbackCard: () => void;
}

export const useFeedbackStore = create<FeedbackState>()((set) => ({
  showFeedbackCard: true,
  setShowFeedbackCard: (show) => set({ showFeedbackCard: show }),
  resetFeedbackCard: () => set({ showFeedbackCard: true }),
}));
