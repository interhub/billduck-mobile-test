import {create, StateCreator} from 'zustand';

export enum STORAGE_TYPE {
  SESSION = 'SESSION'
}

type CreateStoreOptions = {
  storeType: STORAGE_TYPE;
};

/** The only way to create a store. SESSION keeps the state in memory. */
export const createZustandStorageHook = <T>(
  initializer: StateCreator<T>,
  storeOptions: CreateStoreOptions | undefined
) => {
  switch (storeOptions?.storeType) {
    case STORAGE_TYPE.SESSION:
    default:
      return create<T>(initializer);
  }
};
