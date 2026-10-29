import AsyncStorage from '@react-native-async-storage/async-storage';
import {create, StateCreator} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

const asyncStoragePersistConfig = {
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  getItem: async (key: string) => {
    return (await AsyncStorage.getItem(key)) ?? null;
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  }
};

export enum STORAGE_TYPE {
  SESSION = 'SESSION',
  PERSIST_STORAGE = 'PERSIST_STORAGE'
}

export enum STORAGE_NAME {
  APP_STATE_STORE = 'app_state_store',
  IMPORT_STORE = 'import_store'
}

type CreateStoreOptions = {
  storeName: STORAGE_NAME;
  storeType: STORAGE_TYPE;
};

/**
 * The only way to create a store. SESSION keeps the state in memory.
 * PERSIST_STORAGE mirrors it into AsyncStorage, but the persist middleware does not await its
 * writes, so never use it for data that must be on disk before the next step starts.
 */
export const createZustandStorageHook = <T>(
  initializer: StateCreator<T>,
  storeOptions: CreateStoreOptions | undefined
) => {
  switch (storeOptions?.storeType) {
    case STORAGE_TYPE.PERSIST_STORAGE:
      return create(
        persist<T>(initializer, {
          name: storeOptions.storeName,
          storage: createJSONStorage(() => asyncStoragePersistConfig)
        })
      );
    case STORAGE_TYPE.SESSION:
    default:
      return create<T>(initializer);
  }
};
