import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {ConfirmFooter} from '@/src/screens/Import/components/ConfirmFooter';
import {DraftChecking} from '@/src/screens/Import/components/DraftChecking';
import {DraftDetails} from '@/src/screens/Import/components/DraftDetails';
import {FileRejection} from '@/src/screens/Import/components/FileRejection';
import {useDraftActions} from '@/src/screens/Import/hooks/useDraftActions';
import {resolveDraftView} from '@/src/screens/Import/logic/resolveDraftView';
import {useImportStore} from '@/src/stores/importStore';

export const ImportConfirmScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const draft = useImportStore((state) => state.draft);
  const openStatus = () => navigation.replace(SCREEN_NAME.IMPORT_STATUS);
  const {isSending, close, send, chooseAnother} = useDraftActions({
    onLeave: navigation.goBack,
    onSent: openStatus
  });
  const header = <ScreenHeader onBack={close} testID="import_confirm_back_button" />;
  const view = resolveDraftView(draft);
  if (view.kind === 'checking') {
    return (
      <ScreenLayout testID="import_confirm_screen" header={header}>
        <DraftChecking />
      </ScreenLayout>
    );
  }
  if (view.kind === 'rejected') {
    const rejectedFooter = (
      <ConfirmFooter onCancel={close}>
        <MainButton
          title={t.common.chooseAnother}
          onPress={chooseAnother}
          testID="import_confirm_choose_another_button"
        />
      </ConfirmFooter>
    );
    return (
      <ScreenLayout testID="import_confirm_screen" header={header} footer={rejectedFooter}>
        <FileRejection rejection={view.rejection} sizeBytes={view.sizeBytes} />
      </ScreenLayout>
    );
  }
  const footer = (
    <ConfirmFooter onCancel={close}>
      <MainButton
        title={t.importConfirm.send}
        onPress={send}
        loading={isSending}
        testID="import_confirm_send_button"
      />
    </ConfirmFooter>
  );
  return (
    <ScreenLayout testID="import_confirm_screen" header={header} footer={footer}>
      <TextLine variant="display" accessibilityRole="header">
        {t.importConfirm.title}
      </TextLine>
      <DraftDetails draft={view.draft} format={view.format} />
    </ScreenLayout>
  );
};
