import type { NetworkState } from 'expo-network';
import * as Network from 'expo-network';
import { mergeQueryKeys } from '@lukemorales/query-key-factory';
import { onlineManager, QueryClient } from '@tanstack/react-query';

import { debug } from '@acme/config/utils/logger';

import { alertRule } from './query/alert-management/alert-rule';
import { alertType } from './query/alert-management/alert-type';
import { suggestedAlert } from './query/alert-management/suggested-alert';
import { animal } from './query/animal-management/animal';
import { animalGroup } from './query/animal-management/animal-group';
import { accessPermission } from './query/clip-management/access-permission';
import { clip } from './query/clip-management/clip';
import { event } from './query/event-management/event';
import { federatedPrometheus } from './query/federated-prometheus-management/federated-prometheus';
import { notification } from './query/notification-management/notification';
import { testNotification } from './query/notification-management/test-notification';
import { contact } from './query/organization-management/contact';
import { location } from './query/organization-management/location';
import { member } from './query/organization-management/member';
import { organization } from './query/organization-management/organization';
import { prometheus } from './query/prometheus-management/prometheus';
// PLOP_INJECT_IMPORT
import { animalDeviceInstance } from './query/stall-monitor-management/animal-device-instance';
import { animalStall } from './query/stall-monitor-management/animal-stall';
import { deviceAnimalAssignment } from './query/stall-monitor-management/device-animal-assignment';
import { deviceInstance } from './query/stall-monitor-management/device-instance';
import { deviceStallAssignment } from './query/stall-monitor-management/device-stall-assignment';
import { provisioningRequest } from './query/stall-monitor-management/provisioning-request';
import { space } from './query/stall-monitor-management/space';
import { spaceGroup } from './query/stall-monitor-management/space-group';
import { stall } from './query/stall-monitor-management/stall';
import { stallAdjustmentCheck } from './query/stall-monitor-management/stall-adjustment-check';
import { stallGroup } from './query/stall-monitor-management/stall-group';
import { accountDeletionRequest } from './query/user-management/account-deletion-request';
import { resendVerifyEmail } from './query/user-management/resend-verify-email';
import { user } from './query/user-management/user';
import { userForgotPassword } from './query/user-management/user-forgot-password';
import { weather } from './query/weather-data-ingress/weather';

// Resume Queries that were triggered while offline on internet reconnection
onlineManager.setEventListener((setOnline) => {
  let isActive = true;

  // Seed initial online status once on startup
  Network.getNetworkStateAsync()
    .then((state) => {
      if (!isActive) return;

      setOnline(!!(state.isConnected && state.isInternetReachable));
    })
    .catch((err) => {
      debug('Failed to get network state:', err);
    });

  // Keep online status in sync with native network events
  const eventSubscription = Network.addNetworkStateListener(
    (state: NetworkState) => {
      setOnline(!!(state.isConnected && state.isInternetReachable));
    },
  );

  return () => {
    isActive = false;
    eventSubscription.remove();
  };
});

/**
 * Query defaults.
 *
 * The current app sets only `retry` and `networkMode`, which leaves
 * `staleTime` at 0 — every query is stale the moment it resolves, so leaving
 * the For You tab and coming back refetches the whole screen. That is a large
 * part of why the app feels slow on a screen people open many times a day.
 *
 * - `staleTime: 60s` — barn data does not change second to second, and any
 *   screen needing fresher data can lower it per query. Pull-to-refresh still
 *   forces a real refetch, so the user is never stuck with stale data they
 *   asked to update.
 * - `gcTime: 15min` — keeps the cache alive across tab switches so returning
 *   renders instantly from cache while any refetch happens in the background.
 * - `retry: 1` on reads instead of 2. Three attempts against a dead endpoint
 *   is how a loading skeleton ends up spinning for a minute; failing sooner
 *   surfaces the error state the UI already knows how to draw. Mutations keep
 *   the original retry count — a lost write is worse than a slow one.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 15 * 60 * 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

export const name = 'services';

export const queries = mergeQueryKeys(
  // PLOP_INJECT_EXPORT
  animalDeviceInstance,
  deviceAnimalAssignment,
  deviceStallAssignment,
  resendVerifyEmail,
  accountDeletionRequest,
  spaceGroup,
  space,
  alertRule,
  alertType,
  suggestedAlert,
  notification,
  testNotification,
  stallAdjustmentCheck,
  provisioningRequest,
  deviceInstance,
  userForgotPassword,
  member,
  contact,
  accessPermission,
  clip,
  event,
  prometheus,
  federatedPrometheus,
  animalGroup,
  stallGroup,
  stall,
  animalStall,
  animal,
  organization,
  user,
  location,
  weather,
);
