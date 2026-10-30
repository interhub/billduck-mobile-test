import {DefaultTheme, NavigationContainer, Theme} from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {useResumeImportOnForeground} from '@/src/hooks/import/useResumeImportOnForeground';
import {useAppStateWatcher} from '@/src/hooks/sensors/useAppStateWatcher';
import {useSystemBackground} from '@/src/hooks/styles/useSystemBackground';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useInitialAppLoading} from '@/src/hooks/useInitialAppLoading';
import {resolveSystemLanguage} from '@/src/i18n/resolveSystemLanguage';
import {navRef} from '@/src/navigation/config/navRef';
import {RootNavigator} from '@/src/navigation/RootNavigator';
import {useAppStateStore} from '@/src/stores/appStateStore';

void SplashScreen.preventAutoHideAsync();
useAppStateStore.getState().setLanguage(resolveSystemLanguage());

const buildNavigationTheme = (colors: ThemeColors): Theme => ({
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.card,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent
  }
});

export const App = () => {
  useAppStateWatcher();
  useResumeImportOnForeground();
  useSystemBackground();
  const isReady = useInitialAppLoading();
  const colors = useThemeColors();
  if (!isReady) {
    return null;
  }
  const navigationTheme = buildNavigationTheme(colors);
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef} theme={navigationTheme}>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
