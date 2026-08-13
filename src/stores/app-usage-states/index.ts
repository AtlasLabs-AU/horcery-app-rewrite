import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTime } from 'luxon';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { IEvent } from '@acme/services/api/event-management/event';

interface IAppUsageState {
  lastActive?: string;
  getLastActive: () => string | undefined;
  setLastActive: (lastActive: string) => void;
  viewEventLastUpdated: DateTime;
  viewedEvents: IEvent[];
  addViewedEvent: (event: IEvent) => void;
  clearViewedEvents: () => void;
  isEventViewed: (eventId: string) => boolean | undefined;
  getNewEventCount: (events: IEvent[]) => number;
  setViewEventLastUpdated: (dateTime: DateTime) => void;
  lastStallCleaningType?: string;
  getLastStallCleaningType: () => string | undefined;
  setLastStallCleaningType: (type: string) => void;
}

export const useAppUsageStore = create(
  persist(
    (set, get) => ({
      lastActive: undefined,
      getLastActive: () => get().lastActive,
      LastActive: () => get().lastActive,
      setLastActive: (lastActive: string) => set(() => ({ lastActive })),
      viewEventLastUpdated: DateTime.now(),
      viewedEvents: [],

      setViewEventLastUpdated: (dateTime: DateTime) => {
        set({ viewEventLastUpdated: dateTime });
      },

      addViewedEvent: (event: IEvent) => {
        set((state) => ({
          viewedEvents: [...new Set([...state.viewedEvents, event])],
        }));
      },

      clearViewedEvents: () => {
        set({ viewedEvents: [] });
      },

      isEventViewed: (eventId: string) => {
        return get().viewedEvents.some((event) => event.id === eventId);
      },

      getNewEventCount: (events: IEvent[]) => {
        const viewedEventIds = new Set(get().viewedEvents.map((e) => e.id));
        return events.filter((event) => !viewedEventIds.has(event.id)).length;
      },

      lastStallCleaningType: undefined,
      getLastStallCleaningType: () => get().lastStallCleaningType,
      setLastStallCleaningType: (type: string) =>
        set({ lastStallCleaningType: type }),
    }),
    {
      name: 'app-usage-storage', // name of the item in the storage
      storage: createJSONStorage(() => AsyncStorage), // storage adapter
      // Optional: Configure what gets persisted
      partialize: (state: IAppUsageState) => ({
        lastActive: state.lastActive,
        viewEventLastUpdated: state.viewEventLastUpdated,
        viewedEvents: state.viewedEvents,
        lastStallCleaningType: state.lastStallCleaningType,
      }),
    },
  ),
);
