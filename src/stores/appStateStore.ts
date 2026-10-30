import {AppStateStatus} from 'react-native';
import {LANGUAGE} from '@/src/i18n/translations';
import {createZustandStorageHook} from '@/src/utils/store/createZustandStore';

type AppStateStoreState = {
  /** True only while the app is in the foreground: polling and recovery wait for it. */
  isActive: boolean;
  /** Interface language, read from the system at launch and on every return to the foreground. */
  language: LANGUAGE;
  setAppState: (appState: AppStateStatus) => void;
  setLanguage: (language: LANGUAGE) => void;
};

export const useAppStateStore = createZustandStorageHook<AppStateStoreState>((set) => ({
  isActive: true,
  language: LANGUAGE.EN,
  setAppState: (appState) => {
    set({isActive: appState === 'active'});
  },
  setLanguage: (language) => {
    set({language});
  }
}));
