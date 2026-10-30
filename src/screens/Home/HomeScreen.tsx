import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {useImportSubject} from '@/src/hooks/import/useImportSubject';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {HomeActions} from '@/src/screens/Home/components/HomeActions';
import {HomeContent} from '@/src/screens/Home/components/HomeContent';
import {HomeHeader} from '@/src/screens/Home/components/HomeHeader';
import {HomeNotices} from '@/src/screens/Home/components/HomeNotices';
import {useAddStatement} from '@/src/screens/Home/hooks/useAddStatement';
import {resolveCurrentImportTarget} from '@/src/screens/Home/logic/resolveCurrentImportTarget';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';

export const HomeScreen = () => {
  const navigation = useAppNavigation();
  const subject = useImportSubject();
  const hasPendingCleanups = useImportStore((state) => state.pendingCleanups.length > 0);
  const openConfirm = () => navigation.navigate(SCREEN_NAME.IMPORT_CONFIRM);
  const {isPicking, addStatement} = useAddStatement(openConfirm);
  const openCurrentImport = () => {
    if (resolveCurrentImportTarget(subject.phase) === 'report') {
      navigation.navigate(SCREEN_NAME.IMPORT_RESULT);
      return;
    }
    navigation.navigate(SCREEN_NAME.IMPORT_STATUS);
  };
  const openDiagnostics = () => navigation.navigate(SCREEN_NAME.DIAGNOSTICS);
  const retryCleanups = () => {
    void importController.runCleanups();
  };
  const footer = (
    <HomeActions isPicking={isPicking} onAdd={addStatement} onOpenDiagnostics={openDiagnostics} />
  );
  return (
    <ScreenLayout testID="home_screen" footer={footer}>
      <HomeHeader />
      <HomeNotices
        hasPendingCleanups={hasPendingCleanups}
        outcome={subject.outcome}
        onRetryCleanups={retryCleanups}
      />
      <HomeContent onOpenCurrentImport={openCurrentImport} />
    </ScreenLayout>
  );
};
