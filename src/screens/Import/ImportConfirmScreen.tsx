import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';

export const ImportConfirmScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const send = () => navigation.replace(SCREEN_NAME.IMPORT_STATUS);
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_confirm_back_button" />;
  const footer = (
    <MainButton title={t.importConfirm.send} onPress={send} testID="import_confirm_send_button" />
  );
  return (
    <ScreenLayout testID="import_confirm_screen" header={header} footer={footer}>
      <TextLine variant="display" accessibilityRole="header">
        {t.importConfirm.title}
      </TextLine>
      <TextLine>{t.importConfirm.nameNote}</TextLine>
    </ScreenLayout>
  );
};
