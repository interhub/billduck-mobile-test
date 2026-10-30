import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import {TextLine} from '@/src/components/ui/TextLine';
import {LOGO, SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The mark is drawn on a 48 x 48 grid and scaled to `LOGO.markSize`. */
const VIEW_BOX = '0 0 48 48';
const LINE_WIDTH = 2;
const PRINT_LINE_WIDTH = 1.2;
const DUCK_BODY =
  'M6 19C9 23 13 25 18 25L30 24C37 25 40 29 39 33C38 38 31 40 22 40C13 40 8 37 7 31C6.5 27 5.5 23 6 19Z';
const DUCK_WING = 'M15 31C18 28 24 28 27 31C24 34 18 34 15 31Z';
const DUCK_HEAD = {cx: 27, cy: 16, r: 9};
const DUCK_EYE = {cx: 29.5, cy: 14, r: 1.6};
/** A folded receipt with a torn zigzag edge serves as the beak. */
const RECEIPT_BEAK = 'M34 14.5H42L44 15.9L42 17.3L44 18.7L42 20.1H34Z';
const RECEIPT_PRINT = 'M36.5 17.3H40';

/**
 * The duck in profile: a yellow body, graphite lines and a torn receipt for a beak. The lines
 * stay graphite in both themes, so the mark looks the same everywhere. Decorative.
 */
const BillDuckMark = () => {
  const {colors} = useBillDuckLogoStyles();
  const line = colors.textOnAccent;
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={LOGO.markSize} height={LOGO.markSize} viewBox={VIEW_BOX}>
        <Path
          d={DUCK_BODY}
          fill={colors.accent}
          stroke={line}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
        />
        <Path
          d={DUCK_WING}
          fill={colors.accent}
          stroke={line}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
        />
        <Circle {...DUCK_HEAD} fill={colors.accent} stroke={line} strokeWidth={LINE_WIDTH} />
        <Path
          d={RECEIPT_BEAK}
          fill={colors.beak}
          stroke={line}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
        />
        <Path
          d={RECEIPT_PRINT}
          stroke={line}
          strokeWidth={PRINT_LINE_WIDTH}
          strokeLinecap="round"
        />
        <Circle {...DUCK_EYE} fill={line} />
      </Svg>
    </View>
  );
};

type BillDuckLogoProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** The mark and the `BillDuck` wordmark in Unbounded; the wordmark is the screen header. */
export const BillDuckLogo = ({style, testID}: BillDuckLogoProps) => {
  const {styles} = useBillDuckLogoStyles();
  const {t} = useTranslation();
  return (
    <View style={[styles.logo, style]} testID={testID} collapsable={false}>
      <BillDuckMark />
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
    wordmark: {
      flexShrink: 1
    }
  })
);
