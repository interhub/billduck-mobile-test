import {StyleSheet, View} from 'react-native';
import {SPACING} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The name of the app and its question. */
export const HomeHeader = () => {
  const {styles} = useHomeHeaderStyles();
  const {t} = useTranslation();
  return (
    <View style={styles.header}>
      <TextLine variant="display" accessibilityRole="header">
        {t.common.appName}
      </TextLine>
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
