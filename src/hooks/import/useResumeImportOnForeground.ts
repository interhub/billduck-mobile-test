import {useEffect} from 'react';
import {importController} from '@/src/services/importController/importController';
import {useAppStateStore} from '@/src/stores/appStateStore';

/**
 * Mount once at the app root. Back in the foreground the controller resumes polling, reads a
 * ready job again and runs the pending cleanups.
 */
export const useResumeImportOnForeground = (): void => {
  useEffect(() => {
    const unsubscribe = useAppStateStore.subscribe((state, previousState) => {
      if (state.isActive && !previousState.isActive) {
        importController.onForeground();
      }
    });
    return unsubscribe;
  }, []);
};
