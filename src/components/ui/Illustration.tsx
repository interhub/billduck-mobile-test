import {Image, ImageSource} from 'expo-image';
import {StyleProp, StyleSheet, useColorScheme, View, ViewStyle} from 'react-native';
import {ILLUSTRATION} from '@/src/constants/UI_SIZES';
import {resolveThemeName} from '@/src/hooks/styles/useThemeColors';
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

type IllustrationFiles = {
  light: ImageSource;
  dark: ImageSource;
};

/** Metro picks `@2x` or `@3x` by screen density; the dark theme takes the `-dark` file. */
const ILLUSTRATION_FILES: Record<IllustrationName, IllustrationFiles> = {
  empty: {
    light: require('@/assets/illustrations/bd_empty.png'),
    dark: require('@/assets/illustrations/bd_empty-dark.png')
  },
  checking: {
    light: require('@/assets/illustrations/bd_checking.png'),
    dark: require('@/assets/illustrations/bd_checking-dark.png')
  },
  rejected: {
    light: require('@/assets/illustrations/bd_rejected.png'),
    dark: require('@/assets/illustrations/bd_rejected-dark.png')
  },
  waiting: {
    light: require('@/assets/illustrations/bd_waiting.png'),
    dark: require('@/assets/illustrations/bd_waiting-dark.png')
  },
  ready: {
    light: require('@/assets/illustrations/bd_ready.png'),
    dark: require('@/assets/illustrations/bd_ready-dark.png')
  },
  unknown: {
    light: require('@/assets/illustrations/bd_unknown.png'),
    dark: require('@/assets/illustrations/bd_unknown-dark.png')
  },
  error: {
    light: require('@/assets/illustrations/bd_error.png'),
    dark: require('@/assets/illustrations/bd_error-dark.png')
  },
  deleting: {
    light: require('@/assets/illustrations/bd_deleting.png'),
    dark: require('@/assets/illustrations/bd_deleting-dark.png')
  },
  deleted: {
    light: require('@/assets/illustrations/bd_deleted.png'),
    dark: require('@/assets/illustrations/bd_deleted-dark.png')
  }
};

type IllustrationProps = {
  name: IllustrationName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Halves on a large font or a short window: buttons come first. */
const resolveIllustrationWidth = (
  fontScale: number,
  windowHeight: number,
  availableWidth: number
): number => {
  const fullWidth = Math.min(ILLUSTRATION.maxWidth, availableWidth);
  if (fontScale > ILLUSTRATION.shrinkFontScale || windowHeight < ILLUSTRATION.shortWindowHeight) {
    return fullWidth / 2;
  }
  return fullWidth;
};

/**
 * The one picture of a screen. Every picture fits into the same box, so a status change never
 * moves the text under it; on the largest fonts it disappears. Decorative: screen readers skip it.
 */
export const Illustration = ({name, style, testID}: IllustrationProps) => {
  const {styles, dimensions} = useIllustrationStyles();
  const themeName = resolveThemeName(useColorScheme());
  if (dimensions.fontScale > ILLUSTRATION.hideFontScale) {
    return null;
  }
  return (
    <View testID={testID} collapsable={false} style={[styles.box, style]}>
      <Image
        source={ILLUSTRATION_FILES[name][themeName]}
        contentFit="contain"
        style={styles.picture}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
};

const useIllustrationStyles = getResponsiveStylesHook(({dimensions}) =>
  StyleSheet.create({
    box: {
      alignSelf: 'center',
      alignItems: 'center'
    },
    picture: {
      width: resolveIllustrationWidth(dimensions.fontScale, dimensions.height, dimensions.width),
      aspectRatio: ILLUSTRATION.aspectRatio
    }
  })
);
