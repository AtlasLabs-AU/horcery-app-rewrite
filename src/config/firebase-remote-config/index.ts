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

/**
 * The native module is not required at all here.
 *
 * A guarded `require()` is not enough: `@react-native-firebase` throws
 * "Native module NativeRNFBTurboApp is not registered" from inside its own
 * registration, which escapes a surrounding try/catch and reaches the app as an
 * uncaught error. Not referencing it is the only reliable way to run in Expo
 * Go.
 *
 * To restore live Remote Config: make a development build with
 * `@react-native-firebase/remote-config` installed, and reinstate the modular
 * calls (getRemoteConfig / ensureInitialized / fetchAndActivate / getBoolean).
 * The git history for this file has the working version.
 */
const NATIVE_AVAILABLE = false;

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
  if (!NATIVE_AVAILABLE) {
    debug('Remote Config unavailable in Expo Go — using default values.');
  }
  remoteConfigReady = true;
  listeners.forEach((cb) => cb());
  listeners.length = 0;
}

export async function refreshRemoteConfig(): Promise<boolean> {
  return false;
}

export function getRemoteString(_key: string): string {
  return DEFAULT_FRC_VALUES.string;
}

export function getRemoteBoolean(_key: string): boolean {
  return DEFAULT_FRC_VALUES.boolean;
}

export function getRemoteNumber(_key: string): number {
  return DEFAULT_FRC_VALUES.number;
}
