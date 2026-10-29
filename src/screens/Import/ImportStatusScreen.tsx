import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';

export const ImportStatusScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const openReport = () => navigation.navigate(SCREEN_NAME.IMPORT_RESULT);
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_status_back_button" />;
  const footer = (
    <MainButton
      title={t.importStatus.openReport}
      onPress={openReport}
      testID="import_status_open_report_button"
    />
  );
  return (
    <ScreenLayout testID="import_status_screen" header={header} footer={footer}>
      <TextLine variant="display" accessibilityRole="header">
        {t.importStatus.title}
      </TextLine>
      <TextLine>{t.importStatus.explanation.queued}</TextLine>
    </ScreenLayout>
  );
};
