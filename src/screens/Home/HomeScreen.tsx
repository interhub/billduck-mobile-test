import {StyleSheet, View} from 'react-native';
import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export const HomeScreen = () => {
  const {styles} = useHomeScreenStyles();
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const openConfirm = () => navigation.navigate(SCREEN_NAME.IMPORT_CONFIRM);
  const openDiagnostics = () => navigation.navigate(SCREEN_NAME.DIAGNOSTICS);
  const footer = (
    <MainButton
      title={t.home.addStatement}
      onPress={openConfirm}
      testID="home_add_statement_button"
    />
  );
  return (
    <ScreenLayout testID="home_screen" footer={footer}>
      <View style={styles.header}>
        <TextLine variant="display" accessibilityRole="header">
          {t.common.appName}
        </TextLine>
        <TextLine variant="caption">{t.common.slogan}</TextLine>
      </View>
      <TextLine>{t.home.empty}</TextLine>
      <MainButton
        title={t.home.diagnostics}
        variant="quiet"
        onPress={openDiagnostics}
        testID="home_diagnostics_link"
      />
    </ScreenLayout>
  );
};

const useHomeScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    header: {
      gap: SPACING.xs
    }
  })
);
