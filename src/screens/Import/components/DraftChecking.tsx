import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {Illustration} from '@/src/components/ui/Illustration';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The picked file is checked on the phone before anything can be sent. */
export const DraftChecking = () => {
  const {styles, colors} = useDraftCheckingStyles();
  const {t} = useTranslation();
  return (
    <View style={styles.centered}>
      <Illustration name="checking" />
      <ActivityIndicator color={colors.textMuted} />
      <TextLine align="center">{t.importConfirm.checking}</TextLine>
    </View>
  );
};

const useDraftCheckingStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    centered: {
      gap: SPACING.lg,
      alignItems: 'center',
      paddingTop: SPACING.xl
    }
  })
);
