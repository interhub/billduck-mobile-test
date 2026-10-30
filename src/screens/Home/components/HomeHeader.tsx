import {StyleSheet, View} from 'react-native';
import {BillDuckLogo} from '@/src/components/ui/BillDuckLogo';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The logo and the question the app answers. */
export const HomeHeader = () => {
  const {styles} = useHomeHeaderStyles();
  const {t} = useTranslation();
  return (
    <View style={styles.header}>
      <BillDuckLogo testID="home_logo" />
      <TextLine variant="caption">{t.common.slogan}</TextLine>
    </View>
  );
};

const useHomeHeaderStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    header: {
      gap: SPACING.xs
    }
  })
);
