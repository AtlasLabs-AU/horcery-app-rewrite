import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';

import { IUser } from '@acme/services/api/user-management/user';

class SecureAuthStorage {
  getItem = async (key: string) => {
    return await getItemAsync(key);
  };

  setItem = async (key: string, value: string) => {
    return await setItemAsync(key, value);
  };

  removeItem = async (key: string) => {
    return await deleteItemAsync(key);
  };

  saveLastLoggedInUser = (user: IUser) => {
    setItemAsync('lastLoggedInUser', JSON.stringify(user));
  };

  getLastLoggedInUser = async () => {
    return await getItemAsync('lastLoggedInUser');
  };

  removeLastLoggedInUser = async () => {
    return await deleteItemAsync('lastLoggedInUser');
  };
}

export const secureAuthStorage = new SecureAuthStorage();
