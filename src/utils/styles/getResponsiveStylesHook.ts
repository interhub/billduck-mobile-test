import {useMemo} from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';

export type ResponsiveDimensions = {
  width: number;
  height: number;
  /** The system font size multiplier: 1 by default, up to about 3 at the largest setting. */
  fontScale: number;
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  getVW: (percent: number) => number;
  getVH: (percent: number) => number;
};

export type StyleFactoryContext = {
  dimensions: ResponsiveDimensions;
  colors: ThemeColors;
};

type StyleTypeFull = ReturnType<typeof StyleSheet.create>;

/**
 * Builds a style hook from a factory that receives the window dimensions and the palette of the
 * current theme, so every color in a style comes from `UI_COLORS`.
 */
export const getResponsiveStylesHook = <U = undefined, T extends StyleTypeFull = StyleTypeFull>(
  createStyles: (context: StyleFactoryContext, styleArg: U) => T
): ((styleArg?: U) => {styles: T; dimensions: ResponsiveDimensions; colors: ThemeColors}) => {
  return (styleArg?: U) => {
    const {width, height, fontScale} = useWindowDimensions();
    const {top, bottom, left, right} = useSafeAreaInsets();
    const colors = useThemeColors();
    const dimensions: ResponsiveDimensions = useMemo(
      () => ({
        width,
        height,
        fontScale,
        insets: {top, bottom, left, right},
        getVW: (percent: number) => width * (percent / 100),
        getVH: (percent: number) => height * (percent / 100)
      }),
      [width, height, fontScale, top, bottom, left, right]
    );
    const styles = useMemo(
      () => createStyles({dimensions, colors}, styleArg as U),
      [dimensions, colors, styleArg]
    );
    return {
      styles,
      dimensions,
      colors
    };
  };
};
