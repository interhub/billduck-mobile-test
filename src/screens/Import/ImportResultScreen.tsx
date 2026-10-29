import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';

export const ImportResultScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const openDetails = () =>
    navigation.navigate(SCREEN_NAME.PAYMENT_DETAILS, {paymentId: 'rec-001'});
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_result_back_button" />;
  return (
    <ScreenLayout testID="import_result_screen" header={header}>
      <TextLine variant="display" accessibilityRole="header">
        {t.importResult.title}
      </TextLine>
      <MainButton
        title={t.importResult.details}
        variant="secondary"
        onPress={openDetails}
        testID="import_result_details_button"
      />
    </ScreenLayout>
  );
};
