import {Image, ImageSource} from 'expo-image';
import {StyleSheet, View} from 'react-native';
import {TextLine} from '@/src/components/ui/TextLine';
import {LOGO, SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The glossy duck of the app icon; Metro picks `@2x` or `@3x` by screen density. */
const LOGO_MARK: ImageSource = require('@/assets/images/logo-mark.png');

type BillDuckLogoProps = {
  testID?: string;
};

/**
 * The duck of the app icon and the `BillDuck` wordmark in Unbounded; the wordmark is the screen
 * header. The duck has no outline, so one file reads on both themes. Decorative: screen readers skip it.
 */
export const BillDuckLogo = ({testID}: BillDuckLogoProps) => {
  const {styles} = useBillDuckLogoStyles();
  const {t} = useTranslation();
  return (
    <View style={styles.logo} testID={testID} collapsable={false}>
      <Image
        source={LOGO_MARK}
        contentFit="contain"
        style={styles.mark}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <TextLine variant="display" accessibilityRole="header" style={styles.wordmark}>
        {t.common.appName}
      </TextLine>
    </View>
  );
};

const useBillDuckLogoStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    logo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm
    },
    mark: {
      width: LOGO.markSize,
      height: LOGO.markSize
    },
    wordmark: {
      flexShrink: 1
    }
  })
);
