import {AppStateStatus} from 'react-native';
import {LANGUAGE} from '@/src/i18n/translations';
import {
  createZustandStorageHook,
  STORAGE_NAME,
  STORAGE_TYPE
} from '@/src/utils/store/createZustandStore';

type AppStateStoreState = {
  appState: AppStateStatus;
  /** True only while the app is in the foreground: polling and recovery wait for it. */
  isActive: boolean;
  /** Interface language, read from the system at launch and on every return to the foreground. */
  language: LANGUAGE;
  setAppState: (appState: AppStateStatus) => void;
  setLanguage: (language: LANGUAGE) => void;
};

export const useAppStateStore = createZustandStorageHook<AppStateStoreState>(
  (set) => ({
    appState: 'active',
    isActive: true,
    language: LANGUAGE.EN,
    setAppState: (appState) => {
      set({appState, isActive: appState === 'active'});
    },
    setLanguage: (language) => {
      set({language});
    }
  }),
  {storeName: STORAGE_NAME.APP_STATE_STORE, storeType: STORAGE_TYPE.SESSION}
);
