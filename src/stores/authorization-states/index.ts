import { DateTime } from 'luxon';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { FypWidgetPreferences } from '@acme/config/constants/fyp-widget-options';
import { MemberType } from '@acme/config/enums/member-type';
import { UnitType } from '@acme/config/enums/unit-types';
import { error } from '@acme/config/utils/logger';
import { IUser, userService } from '@acme/services/api/user-management/user';

import { zustandMmkvStorage } from '../storage';

export interface IUserPreferencesState {
  aiInsights?: boolean;
  allowNotifications?: boolean;
  behavioralNotification?: boolean;
  environmentalNotification?: boolean;
  fypWidgets?: FypWidgetPreferences;
  isMetric?: boolean;
  other?: boolean;
  securityNotification?: boolean;
  timezone?: string;
  unit_type?: number;
  snapshotPlaybackMode?: string;
  reviewCards?: {
    visibleEventTypes: number[];
  };
}

interface IAuthState {
  accessToken: string | null;
  uid: string | null;
  memberId: string | null;
  organizationID: string | null;
  organizationName: string | null;
  userPreferences: IUserPreferencesState | null;
  memberType: MemberType | null;
  behaviorTrackerViewMode: 'animal' | 'stall' | null;
  tempEmail: string;
}

interface IAuthActions {
  user: IUser | null;
  setUser: (user: IUser) => void;
  setAccessToken: (token: string | null) => void;
  setUid: (uid: string | null) => void;
  setMemberId: (memberId: string | null) => void;
  setOrganization: (orgID: string | null, orgName: string | null) => void;
  setUserPreferences: (preferences: IUserPreferencesState | null) => void;
  setMemberType: (memberType: MemberType | null) => void;
  setBehaviorTrackerViewMode: (mode: 'animal' | 'stall') => void;
  getAccessToken: () => string | null;
  getUid: () => string | null;
  getMemberId: () => string | null;
  getOrganizationID: () => string | null;
  getOrganizationName: () => string | null;
  getUserPreferences: () => IUserPreferencesState | null;
  getMemberType: () => MemberType | null;
  getBehaviorTrackerViewMode: () => 'animal' | 'stall' | null;
  removeOrganizationID: () => void;
  initialize: () => void;
  signOut: () => void;
  setTempEmail: (email: string) => void;
  getTempEmail: () => string;
  clearTempEmail: () => void;
}

const setUserPreferences = (state?: IAuthState & IAuthActions) => {
  const existingPreferences = state?.userPreferences;
  if (existingPreferences) {
    const updates: Partial<IUserPreferencesState> = {};
    let needsUpdate = false;

    // Only set metric preference if it doesn't exist
    if (existingPreferences.isMetric == null) {
      updates.isMetric = false;
      updates.unit_type = UnitType.IMPERIAL;
      needsUpdate = true;
    }

    // Only set timezone if it doesn't exist
    if (!existingPreferences.timezone) {
      updates.timezone = DateTime.local().zoneName;
      needsUpdate = true;
    }

    // Only set notification preferences if allowNotifications doesn't exist
    if (existingPreferences.allowNotifications == null) {
      updates.other = true;
      updates.aiInsights = true;
      updates.allowNotifications = true;
      updates.securityNotification = true;
      updates.behavioralNotification = true;
      updates.environmentalNotification = true;
      needsUpdate = true;
    }

    // Only update if there are changes to make
    if (needsUpdate) {
      const updated: IUserPreferencesState = {
        ...existingPreferences,
        ...updates,
      };

      userService.updatePatch(state.uid!, { UserMetaData: updated });
      state.setUserPreferences(updated);
    }
  }
};

export const useAuthStore = create<IAuthState & IAuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      uid: null,
      memberId: null,
      organizationID: null,
      organizationName: null,
      userPreferences: null,
      memberType: null,
      behaviorTrackerViewMode: null,
      tempEmail: '',

      // Actions
      setUser: (user) => {
        set({ user });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      setUid: (uid) => set({ uid }),

      setMemberId: (memberId) => set({ memberId }),

      setOrganization: (orgID, orgName) =>
        set({ organizationID: orgID, organizationName: orgName }),

      setUserPreferences: (preferences) =>
        set({ userPreferences: preferences }),

      setMemberType: (memberType) => set({ memberType }),

      setBehaviorTrackerViewMode: (mode) =>
        set({ behaviorTrackerViewMode: mode }),

      getAccessToken: () => get().accessToken,

      getUid: () => get().uid,

      getMemberId: () => get().memberId,

      getOrganizationID: () => get().organizationID,

      getOrganizationName: () => get().organizationName,

      getUserPreferences: () => get().userPreferences,

      getMemberType: () => get().memberType,

      getBehaviorTrackerViewMode: () => get().behaviorTrackerViewMode,

      initialize: () => setUserPreferences(get()),

      setTempEmail: (email) => set({ tempEmail: email }),

      getTempEmail: () => get().tempEmail,

      clearTempEmail: () => set({ tempEmail: '' }),

      signOut: () =>
        set({
          accessToken: null,
          uid: null,
          memberId: null, // NEW: clear member ID on sign out
          organizationID: null,
          organizationName: null,
          userPreferences: null,
          user: null,
          memberType: null,
          tempEmail: '',
        }),

      removeOrganizationID: () =>
        set({ organizationID: null, organizationName: null }),
    }),
    {
      name: 'auth-storage',
      storage: zustandMmkvStorage,

      partialize: (state) => {
        const { tempEmail: _tempEmail, ...persisted } = state;
        return persisted;
      },

      onRehydrateStorage: () => (state, err) => {
        if (err) {
          error('Auth store hydration failed:', err);
          return;
        }
        setUserPreferences(state);
      },
    },
  ),
);
