import {AppActivity} from '@/src/services/importController/importControllerTypes';
import {useAppStateStore} from '@/src/stores/appStateStore';

/** Foreground state for the controller, read from the one AppState listener of the app. */
export const appActivity: AppActivity = {
  isActive: () => useAppStateStore.getState().isActive,
  whenActive: () => {
    if (useAppStateStore.getState().isActive) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const unsubscribe = useAppStateStore.subscribe((state) => {
        if (state.isActive) {
          unsubscribe();
          resolve();
        }
      });
    });
  }
};
