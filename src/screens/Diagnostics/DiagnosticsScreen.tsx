import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {ENV} from '@/src/config/env';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';

export const DiagnosticsScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const header = <ScreenHeader onBack={navigation.goBack} testID="diagnostics_back_button" />;
  return (
    <ScreenLayout testID="diagnostics_screen" header={header}>
      <TextLine variant="display" accessibilityRole="header">
        {t.diagnostics.title}
      </TextLine>
      <TextLine variant="money">{ENV.API_BASE_URL}</TextLine>
    </ScreenLayout>
  );
};
