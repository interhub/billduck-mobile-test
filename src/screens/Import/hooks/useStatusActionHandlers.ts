import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {StatusActionHandlers} from '@/src/screens/Import/logic/resolveStatusActions';
import {importController} from '@/src/services/importController/importController';

/** What each action of the status screen does, and where the screen goes after it. */
export const useStatusActionHandlers = (): StatusActionHandlers => {
  const navigation = useAppNavigation();
  const toHome = () => navigation.popTo(SCREEN_NAME.HOME);
  const cancelUpload = async () => {
    await importController.cancelUpload();
    toHome();
  };
  const pickAgain = async () => {
    const isPicked = await importController.pickFile();
    if (isPicked) {
      navigation.replace(SCREEN_NAME.IMPORT_CONFIRM);
    }
  };
  return {
    retry: () => {
      void importController.retry();
    },
    sendAgain: () => {
      void importController.sendAgain();
    },
    cancelUpload: () => {
      void cancelUpload();
    },
    deleteRunningImport: () => {
      void importController.deleteImport();
    },
    cancelReplacement: () => {
      importController.cancelDraft();
      toHome();
    },
    openReport: () => navigation.popTo(SCREEN_NAME.IMPORT_RESULT),
    pickAgain: () => {
      void pickAgain();
    },
    toHome
  };
};
