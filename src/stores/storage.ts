import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, StateStorage } from 'zustand/middleware';

export const storage = createMMKV({
  id: 'app-storage',
  encryptionKey: 'secure-auth-key',
});

export const MMKVStorage: StateStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
    return true;
  },
  removeItem: (name: string) => {
    storage.remove(name);
    return;
  },
};

export const zustandMmkvStorage = createJSONStorage(() => MMKVStorage);
