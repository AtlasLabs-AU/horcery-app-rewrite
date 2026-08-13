import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, StateStorage } from 'zustand/middleware';

/**
 * Persistence backend for the zustand stores.
 *
 * The current app uses `react-native-mmkv`, which is faster but is a native
 * module (NitroModules) and therefore unavailable in Expo Go. AsyncStorage is
 * the portable equivalent and is already a dependency.
 *
 * The exported names match the current app's so the ported stores are
 * unchanged. When the rewrite moves to a development build, swapping back is a
 * change to this file alone.
 *
 * Note: MMKV was configured with an `encryptionKey` whose value was a literal
 * in the source — which offers little protection, since anyone with the bundle
 * has the key. Genuinely sensitive values belong in SecureStore (as the auth
 * refresh token now is), not in a store with a hardcoded key.
 */
export const AppStorage: StateStorage = {
  getItem: async (name: string) => {
    return (await AsyncStorage.getItem(name)) ?? null;
  },
  setItem: async (name: string, value: string) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

/** Kept for import compatibility with the ported stores. */
export const MMKVStorage = AppStorage;
export const zustandMmkvStorage = createJSONStorage(() => AppStorage);
