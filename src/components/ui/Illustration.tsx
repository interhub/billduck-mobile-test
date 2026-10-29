import {StyleSheet, View} from 'react-native';
import {ILLUSTRATION, RADIUS} from '@/src/constants/UI_SIZES';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export type IllustrationName =
  | 'empty'
  | 'checking'
  | 'rejected'
  | 'waiting'
  | 'ready'
  | 'unknown'
  | 'error'
  | 'deleting'
  | 'deleted';

type IllustrationProps = {
  name: IllustrationName;
};

type IllustrationSize = {
  width: number;
  isHidden: boolean;
};

/** Halves on a large font or a short window, disappears on the largest fonts: buttons come first. */
const resolveIllustrationSize = (
  fontScale: number,
  windowHeight: number,
  availableWidth: number
): IllustrationSize => {
  if (fontScale > ILLUSTRATION.hideFontScale) {
    return {width: 0, isHidden: true};
  }
  const fullWidth = Math.min(ILLUSTRATION.maxWidth, availableWidth);
  if (fontScale > ILLUSTRATION.shrinkFontScale || windowHeight < ILLUSTRATION.shortWindowHeight) {
    return {width: fullWidth / 2, isHidden: false};
  }
  return {width: fullWidth, isHidden: false};
};

/** The one picture of a screen. Until the pictures exist it holds a plain block of the final size. */
export const Illustration = (_props: IllustrationProps) => {
  const {styles, dimensions} = useIllustrationStyles();
  const size = resolveIllustrationSize(dimensions.fontScale, dimensions.height, dimensions.width);
  if (size.isHidden) {
    return null;
  }
  return (
    <View
      style={[styles.placeholder, {width: size.width}]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
};

const useIllustrationStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    placeholder: {
      alignSelf: 'center',
      aspectRatio: ILLUSTRATION.aspectRatio,
      borderRadius: RADIUS.card,
      backgroundColor: colors.surfaceSecondary
    }
  })
);
