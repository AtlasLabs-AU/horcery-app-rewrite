import { DEFAULT_FRC_VALUES } from '@acme/config/constants/default-frc-values';

import { debug } from '../utils/logger';

/**
 * Firebase Remote Config, with a graceful absence.
 *
 * Remote Config has no usable client-side REST API (its REST surface needs a
 * service account), so unlike auth it cannot follow the native module out of
 * the build. While the app runs in Expo Go, the native module is simply not
 * there.
 *
 * That turns out to be survivable by design: the current app's getters already
 * fall back to `DEFAULT_FRC_VALUES` on any error, precisely so a failed fetch
 * at cold start cannot break the app. Here that path is simply always taken.
 *
 * **The caveat is real though:** feature flags run on defaults, not on what
 * production is actually serving. Any flag-dependent behaviour must be checked
 * on a development build before it is trusted.
 */

type RemoteConfigModule = typeof import('@react-native-firebase/remote-config');
type AppModule = typeof import('@react-native-firebase/app');

let native: { rc: RemoteConfigModule; app: AppModule } | null | undefined;

/** Resolves the native module once, or records that it is unavailable. */
function getNative() {
  if (native !== undefined) return native;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rc = require('@react-native-firebase/remote-config') as RemoteConfigModule;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const app = require('@react-native-firebase/app') as AppModule;
    native = { rc, app };
  } catch {
    debug('Remote Config native module unavailable — using default values.');
    native = null;
  }
  return native;
}

let remoteConfigReady = false;
const listeners: (() => void)[] = [];

export function onRemoteConfigReady(callback: () => void): () => void {
  if (remoteConfigReady) {
    callback();
    return () => {};
  }
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
}

export async function initRemoteConfig(): Promise<void> {
  const mod = getNative();
  try {
    if (!mod) return;

    const remoteConfig = mod.rc.getRemoteConfig(mod.app.getApp());
    remoteConfig.settings = {
      minimumFetchIntervalMillis: 300 * 1000, // 5 mins
      // The current app writes `fetchTimeMillis` here, which is not a real
      // setting — its intended 30s timeout never applied and fetches used the
      // 60s default. Corrected to the actual key.
      fetchTimeoutMillis: 30 * 1000,
    };

    await mod.rc.ensureInitialized(remoteConfig).catch((e: unknown) => {
      debug('Failed to initialize Firebase remote config:', e);
    });

    const updated = await mod.rc
      .fetchAndActivate(remoteConfig)
      .catch((e: unknown) => {
        debug('Failed to fetch and activate Firebase remote config:', e);
        return false;
      });

    debug(`Firebase remote config was ${updated ? 'updated' : 'not updated'}`);
  } catch (e) {
    debug('Firebase remote config init failed (handled silently):', e);
  } finally {
    remoteConfigReady = true;
    listeners.forEach((cb) => cb());
    listeners.length = 0;
  }
}

export async function refreshRemoteConfig(): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    return await mod.rc.fetchAndActivate(
      mod.rc.getRemoteConfig(mod.app.getApp()),
    );
  } catch (e) {
    debug('Firebase remote config refresh failed (handled silently):', e);
    return false;
  }
}

export function getRemoteString(key: string): string {
  const mod = getNative();
  if (!mod) return DEFAULT_FRC_VALUES.string;
  try {
    return (
      mod.rc.getString(mod.rc.getRemoteConfig(mod.app.getApp()), key) ??
      DEFAULT_FRC_VALUES.string
    );
  } catch {
    return DEFAULT_FRC_VALUES.string;
  }
}

export function getRemoteBoolean(key: string): boolean {
  const mod = getNative();
  if (!mod) return DEFAULT_FRC_VALUES.boolean;
  try {
    return (
      mod.rc.getBoolean(mod.rc.getRemoteConfig(mod.app.getApp()), key) ??
      DEFAULT_FRC_VALUES.boolean
    );
  } catch {
    return DEFAULT_FRC_VALUES.boolean;
  }
}

export function getRemoteNumber(key: string): number {
  const mod = getNative();
  if (!mod) return DEFAULT_FRC_VALUES.number;
  try {
    return (
      mod.rc.getNumber(mod.rc.getRemoteConfig(mod.app.getApp()), key) ??
      DEFAULT_FRC_VALUES.number
    );
  } catch {
    return DEFAULT_FRC_VALUES.number;
  }
}
