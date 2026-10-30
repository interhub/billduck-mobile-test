import {ColorSchemeName, useColorScheme} from 'react-native';
import {ThemeColors, ThemeName, UI_COLORS} from '@/src/constants/UI_COLORS';

/** 'dark' gives the dark palette; 'light', 'unspecified' and null give the light one. */
export const resolveThemeName = (colorScheme: ColorSchemeName | null | undefined): ThemeName => {
  if (colorScheme === 'dark') {
    return 'dark';
  }
  return 'light';
};

export const useThemeColors = (): ThemeColors => {
  const colorScheme = useColorScheme();
  return UI_COLORS[resolveThemeName(colorScheme)];
};
