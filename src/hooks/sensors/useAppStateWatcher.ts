import {useEffect} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {resolveSystemLanguage} from '@/src/i18n/resolveSystemLanguage';
import {useAppStateStore} from '@/src/stores/appStateStore';

const ACTIVE_STATE: AppStateStatus = 'active';

/**
 * Global watcher: bridges React Native AppState -> Zustand app state store.
 * Mount once at the app root. It is the only AppState listener of the app.
 * On every return to the foreground it also reads the system language again: on Android the
 * activity is not recreated by a language change.
 */
export const useAppStateWatcher = () => {
  useEffect(() => {
    const currentState: AppStateStatus = AppState?.currentState ?? ACTIVE_STATE;
    useAppStateStore.getState().setAppState(currentState);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === ACTIVE_STATE) {
        useAppStateStore.getState().setLanguage(resolveSystemLanguage());
      }
      useAppStateStore.getState().setAppState(nextState);
    });
    return () => {
      subscription?.remove?.();
    };
  }, []);
};
