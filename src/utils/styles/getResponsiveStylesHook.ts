import {useMemo} from 'react';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';

type ResponsiveDimensions = {
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

type StyleFactoryContext = {
  dimensions: ResponsiveDimensions;
  colors: ThemeColors;
};

type StyleTypeFull = ReturnType<typeof StyleSheet.create>;

const PERCENT_BASE = 100;

/**
 * Builds a style hook from a factory that receives the window dimensions and the palette of the
 * current theme, so every color in a style comes from `UI_COLORS`. The styles are memoized here
 * and nowhere else: React Compiler does not compile the anonymous hook this returns, so without
 * the memo every render would create a new style sheet.
 * P.S.: Stepan: This is My personal best solution on a Stack Overflow for responsive styles: https://stackoverflow.com/a/72019531/14637471
 */
export const getResponsiveStylesHook = <T extends StyleTypeFull = StyleTypeFull>(
  createStyles: (context: StyleFactoryContext) => T
): (() => {styles: T; dimensions: ResponsiveDimensions; colors: ThemeColors}) => {
  return () => {
    const {width, height, fontScale} = useWindowDimensions();
    const {top, bottom, left, right} = useSafeAreaInsets();
    const colors = useThemeColors();
    const dimensions: ResponsiveDimensions = useMemo(
      () => ({
        width,
        height,
        fontScale,
        insets: {top, bottom, left, right},
        getVW: (percent: number) => width * (percent / PERCENT_BASE),
        getVH: (percent: number) => height * (percent / PERCENT_BASE)
      }),
      [width, height, fontScale, top, bottom, left, right]
    );
    const styles = useMemo(() => createStyles({dimensions, colors}), [dimensions, colors]);
    return {
      styles,
      dimensions,
      colors
    };
  };
};
