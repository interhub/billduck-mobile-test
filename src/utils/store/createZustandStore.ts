import {create, StateCreator} from 'zustand';

/**
 * The only way to create a store. Every store lives in memory: the import repository owns the
 * disk and waits for every write, which the zustand `persist` middleware never does.
 */
export const createZustandStorageHook = <T>(initializer: StateCreator<T>) => {
  return create<T>(initializer);
};
