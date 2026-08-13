import { getApp } from '@react-native-firebase/app';
import { getRemoteConfig } from '@react-native-firebase/remote-config';

import { DEFAULT_FRC_VALUES } from '@acme/config/constants/default-frc-values';

import { debug } from '../utils/logger';

let remoteConfigReady = false;
const listeners: (() => void)[] = [];

export function onRemoteConfigReady(callback: () => void): () => void {
  if (remoteConfigReady) {
    callback();
    return () => {
      // No-op unsubscribe since callback was called immediately
    };
  }

  listeners.push(callback);

  // return unsubscribe function
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Initializes Firebase Remote Config. Wrapped in try/catch so native crashes
 * (e.g. URLSession/CFNetwork around cold start) don't take down the app;
 * we handle failures silently and continue with defaults.
 */
export async function initRemoteConfig(): Promise<void> {
  try {
    const app = getApp();
    const remoteConfig = getRemoteConfig(app);

    await remoteConfig
      .setConfigSettings({
        minimumFetchIntervalMillis: 300 * 1000, // 5 mins
        fetchTimeMillis: 30 * 1000, // 30 s timeout
      })
      .catch((e) => {
        debug('Failed to set config settings for Firebase remote config:', e);
      });

    await remoteConfig
      .setDefaults({
        IN_STALL_DETECTION_QUERY: DEFAULT_FRC_VALUES.string,
        STALL_OCCUPANCY_QUERY: DEFAULT_FRC_VALUES.string,
        STALL_OCCUPANCY_V2_QUERY: DEFAULT_FRC_VALUES.string,
        ANIMAL_IN_STALL_STATUS_QUERY: DEFAULT_FRC_VALUES.string,
        HUMAN_OUT_OF_STALL_DETECTION_QUERY: DEFAULT_FRC_VALUES.string,
        HUMAN_OUT_OF_STALL_DETECTION_QUERY_OPTIMIZED: DEFAULT_FRC_VALUES.string,
        HUMAN_IN_STALL_DETECTION_QUERY: DEFAULT_FRC_VALUES.string,
        HUMAN_IN_STALL_DETECTION_QUERY_OPTIMIZED: DEFAULT_FRC_VALUES.string,
        HUMAN_IN_SPACE_DETECTION_QUERY: DEFAULT_FRC_VALUES.string,
        ANIMAL_SITTING_DOWN_DETECTION_QUERY: DEFAULT_FRC_VALUES.string,
        ANIMAL_SITTING_DOWN_DETECTION_QUERY_OPTIMIZED:
          DEFAULT_FRC_VALUES.string,
        ACCOUNT_DELETION_TIME_PERIOD: DEFAULT_FRC_VALUES.number,
        RADIAL_LAST_24_HOURS_QUERY: DEFAULT_FRC_VALUES.string,
        TREND_LAST_24_HOURS_QUERY: DEFAULT_FRC_VALUES.string,
        THRESHOLD_24_HOURS_OUT_OF_STALL: DEFAULT_FRC_VALUES.number,
        THRESHOLD_24_HOURS_AWAKE: DEFAULT_FRC_VALUES.number,
        THRESHOLD_24_HOURS_RESTING: DEFAULT_FRC_VALUES.number,
        EXCLUDE_IN_STALL_LOWER_THRESHOLD: DEFAULT_FRC_VALUES.number,
        EXCLUDE_IN_STALL_UPPER_THRESHOLD: DEFAULT_FRC_VALUES.number,
        AVG_FEDERATED_PROM_QUERY_HOURLY: DEFAULT_FRC_VALUES.string,
        AVG_HUMAN_PRESENCE_FEDERATED_PROM_QUERY_HOURLY:
          DEFAULT_FRC_VALUES.string,
        AVG_LYING_DOWN_FEDERATED_PROM_QUERY_HOURLY: DEFAULT_FRC_VALUES.string,
        AVG_OCCUPANCY_FEDERATED_PROM_QUERY_HOURLY: DEFAULT_FRC_VALUES.string,
        AVG_HUMAN_PRESENCE_FEDERATED_PROM_QUERY_HOURLY_SORTED_DESC:
          DEFAULT_FRC_VALUES.string,
        AVG_LYING_DOWN_FEDERATED_PROM_QUERY_HOURLY_SORTED_DESC:
          DEFAULT_FRC_VALUES.string,
        AVG_OCCUPANCY_FEDERATED_PROM_QUERY_HOURLY_SORTED_DESC:
          DEFAULT_FRC_VALUES.string,
        AVG_WEEKLY_OCCUPANCY_FEDERATED_PROM_QUERY: DEFAULT_FRC_VALUES.string,
        AVG_WEEKLY_HUMAN_PRESENCE_FEDERATED_PROM_QUERY:
          DEFAULT_FRC_VALUES.string,
        AVG_WEEKLY_LYING_DOWN_FEDERATED_PROM_QUERY: DEFAULT_FRC_VALUES.string,
        OCCUPANCY_DATA_BACKEND_SWITCH: DEFAULT_FRC_VALUES.boolean,
        LAST_CHECKED_AT_HOURS_DIFFERENCE: DEFAULT_FRC_VALUES.number,
        MIN_RN_APP_VERSION: DEFAULT_FRC_VALUES.string,
        RN_APP_VERSION: DEFAULT_FRC_VALUES.string,
        INTAKE_SCALE_USER_IDS: DEFAULT_FRC_VALUES.string,
        EXPORT_CHART_ORG_IDS: DEFAULT_FRC_VALUES.string,
        EXPORT_ALL_DATA_ORG_IDS: DEFAULT_FRC_VALUES.string,
        HIDE_LAST_24_HOURS: DEFAULT_FRC_VALUES.boolean,
        HIDE_TRENDS_ACTIVENESS: DEFAULT_FRC_VALUES.boolean,
        HIDE_TRENDS_ROLLING: DEFAULT_FRC_VALUES.boolean,
        HIDE_STALL_OCCUPANCY: DEFAULT_FRC_VALUES.boolean,
        HIDE_HUMAN_IN_STALL: DEFAULT_FRC_VALUES.boolean,
        HIDE_HUMAN_NEAR_STALL: DEFAULT_FRC_VALUES.boolean,
        HIDE_LYING_DOWN: DEFAULT_FRC_VALUES.boolean,
        HIDE_ACTIVENESS: DEFAULT_FRC_VALUES.boolean,
        HIDE_ENVIRONMENT_CLIMATE: DEFAULT_FRC_VALUES.boolean,
        HIDE_ENVIRONMENT_AMBIENT: DEFAULT_FRC_VALUES.boolean,
        SPACES_ORG_IDS: DEFAULT_FRC_VALUES.string,
        MANAGE_ALERTS_ORG_IDS: DEFAULT_FRC_VALUES.string,
        WIFI_SIGNAL_EXCELLENT_THRESHOLD: DEFAULT_FRC_VALUES.number,
        WIFI_SIGNAL_GOOD_THRESHOLD: DEFAULT_FRC_VALUES.number,
        WIFI_SIGNAL_FAIR_THRESHOLD: DEFAULT_FRC_VALUES.number,
        WIFI_SIGNAL_POOR_THRESHOLD: DEFAULT_FRC_VALUES.number,
        ALERTS_ORG_ENABLED: DEFAULT_FRC_VALUES.boolean,
        ALERTS_ORG_IDS: DEFAULT_FRC_VALUES.string,
        FYP_CHARTS_ORG_ENABLED: DEFAULT_FRC_VALUES.boolean,
        FYP_CHARTS_ORG_IDS: DEFAULT_FRC_VALUES.string,
        DISPLAY_DEVIATION_TAG_FOR_LYING_DOWN: DEFAULT_FRC_VALUES.boolean,
        DISPLAY_DEVIATION_TAG_FOR_HUMAN_IN_STALL: DEFAULT_FRC_VALUES.boolean,
        DISPLAY_DEVIATION_TAG_FOR_STALL_OCCUPANCY: DEFAULT_FRC_VALUES.boolean,
        DISPLAY_DEVIATION_TAG_FOR_CONSUMPTION: DEFAULT_FRC_VALUES.boolean,
        DISPLAY_DEVIATION_TAG_FOR_SLEEPING: DEFAULT_FRC_VALUES.boolean,
      })
      .catch((e) => {
        debug('Failed to set default values for Firebase remote config:', e);
      });

    await remoteConfig.ensureInitialized().catch((e) => {
      debug('Failed to initialize Firebase remote config:', e);
    });

    let updated = false;
    try {
      updated = await remoteConfig.fetchAndActivate();
    } catch (e) {
      debug('Failed to fetch and activate Firebase remote config:', e);
    }

    debug(`Firebase remote config was ${updated ? 'updated' : 'not updated'}`);
  } catch (e) {
    debug('Firebase remote config init failed (handled silently):', e);
  } finally {
    remoteConfigReady = true;
    listeners.forEach((cb) => cb());
    listeners.length = 0;
  }
}

/**
 * Re-fetches and activates Remote Config. Safe to call on app resume.
 * Honors minimumFetchIntervalMillis (currently 5 min) — returns false when
 * throttled or on failure, but activated values remain readable either way.
 */
export async function refreshRemoteConfig(): Promise<boolean> {
  try {
    const remoteConfig = getRemoteConfig(getApp());
    const updated = await remoteConfig.fetchAndActivate();
    debug(
      `Firebase remote config refresh ${updated ? 'updated' : 'not updated'}`,
    );
    return updated;
  } catch (e) {
    debug('Firebase remote config refresh failed (handled silently):', e);
    return false;
  }
}

/**
 * Safe getters: return defaults on any error (e.g. native bridge or uninitialized).
 * Prevents crashes from propagating when Remote Config is used after cold start.
 */
export function getRemoteString(key: string): string {
  try {
    return (
      getRemoteConfig(getApp()).getString(key) ?? DEFAULT_FRC_VALUES.string
    );
  } catch {
    return DEFAULT_FRC_VALUES.string;
  }
}

export function getRemoteBoolean(key: string): boolean {
  try {
    return (
      getRemoteConfig(getApp()).getBoolean(key) ?? DEFAULT_FRC_VALUES.boolean
    );
  } catch {
    return DEFAULT_FRC_VALUES.boolean;
  }
}

export function getRemoteNumber(key: string): number {
  try {
    return (
      getRemoteConfig(getApp()).getNumber(key) ?? DEFAULT_FRC_VALUES.number
    );
  } catch {
    return DEFAULT_FRC_VALUES.number;
  }
}
