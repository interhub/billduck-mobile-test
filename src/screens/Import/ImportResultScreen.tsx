import {useFocusEffect} from '@react-navigation/native';
import {useCallback} from 'react';
import {useShallow} from 'zustand/react/shallow';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useImportSubject} from '@/src/hooks/import/useImportSubject';
import {useStatusRefresh} from '@/src/hooks/import/useStatusRefresh';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {DeleteImportButton} from '@/src/screens/Import/components/DeleteImportButton';
import {PaymentList} from '@/src/screens/Import/components/PaymentList';
import {ResultLoading} from '@/src/screens/Import/components/ResultLoading';
import {ResultMeta} from '@/src/screens/Import/components/ResultMeta';
import {ResultTotal} from '@/src/screens/Import/components/ResultTotal';
import {useResultRedirect} from '@/src/screens/Import/hooks/useResultRedirect';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';

export const ImportResultScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const {operation, payments} = useImportStore(
    useShallow((state) => ({operation: state.operation, payments: state.payments}))
  );
  const subject = useImportSubject();
  const {isRefreshing, refresh} = useStatusRefresh();
  useResultRedirect(subject.phase);
  // Opening the report reads the status once more, so an older answer can show up and be skipped.
  useFocusEffect(
    useCallback(() => {
      void importController.refreshStatus();
    }, [])
  );
  const openStatus = () => navigation.navigate(SCREEN_NAME.IMPORT_STATUS);
  const openPaymentDetails = (paymentId: string) =>
    navigation.navigate(SCREEN_NAME.PAYMENT_DETAILS, {paymentId});
  const deleteImport = () => {
    void importController.deleteImport();
  };
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_result_back_button" />;
  const title = (
    <TextLine variant="display" accessibilityRole="header">
      {t.importResult.title}
    </TextLine>
  );
  if (!payments || !operation) {
    return (
      <ScreenLayout
        testID="import_result_screen"
        header={header}
        onRefresh={refresh}
        refreshing={isRefreshing}
      >
        {title}
        <ResultLoading phase={subject.phase} />
      </ScreenLayout>
    );
  }
  const footer = <DeleteImportButton onDelete={deleteImport} />;
  return (
    <ScreenLayout
      testID="import_result_screen"
      header={header}
      footer={footer}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      {title}
      <ResultTotal payments={payments} />
      <PaymentList payments={payments} onOpenPayment={openPaymentDetails} />
      <ResultMeta operationId={operation.operationId} onOpenStatus={openStatus} />
    </ScreenLayout>
  );
};
