import { create } from 'zustand';

interface IAppState {
  isFirstLoad: boolean;
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setIsFirstLoad: (value: boolean) => void;
  lastActiveDetailedPage: 'animals' | 'stalls' | 'spaces' | undefined;
  setLastActiveDetailedPage: (
    page: 'animals' | 'stalls' | 'spaces' | undefined,
  ) => void;
  lastActiveDetailedPageTimestamp: number | undefined;
  setLastActiveDetailedPageTimestamp: (timestamp: number | undefined) => void;
  isSuggestedAlertsDismissed: boolean;
  dismissSuggestedAlerts: () => void;
  enableSuggestedAlerts: () => void;
  isAlertNotificationsDismissed: boolean;
  dismissAlertNotifications: () => void;
  enableAlertNotifications: () => void;
}

export const useAppStore = create<IAppState>((set) => ({
  isFirstLoad: true,
  isSidebarOpen: false,
  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () =>
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    })),
  setIsFirstLoad: (value) => set({ isFirstLoad: value }),
  lastActiveDetailedPage: 'animals',
  setLastActiveDetailedPage: (page) => set({ lastActiveDetailedPage: page }),
  lastActiveDetailedPageTimestamp: undefined,
  setLastActiveDetailedPageTimestamp: (timestamp) =>
    set({ lastActiveDetailedPageTimestamp: timestamp }),
  isSuggestedAlertsDismissed: false,
  dismissSuggestedAlerts: () => set({ isSuggestedAlertsDismissed: true }),
  enableSuggestedAlerts: () => set({ isSuggestedAlertsDismissed: false }),
  isAlertNotificationsDismissed: false,
  dismissAlertNotifications: () => set({ isAlertNotificationsDismissed: true }),
  enableAlertNotifications: () => set({ isAlertNotificationsDismissed: false }),
}));
