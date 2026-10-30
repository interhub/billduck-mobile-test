import {useFonts} from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {useEffect} from 'react';
import {FONT_NAME} from '@/src/constants/FONT_NAME';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';
import {resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

const FONT_FILES = {
  [FONT_NAME.UNBOUNDED_SEMIBOLD]: require('@/assets/fonts/Unbounded-SemiBold.ttf'),
  [FONT_NAME.GEIST_REGULAR]: require('@/assets/fonts/Geist-Regular.ttf'),
  [FONT_NAME.GEIST_MEDIUM]: require('@/assets/fonts/Geist-Medium.ttf'),
  [FONT_NAME.GEIST_MONO_REGULAR]: require('@/assets/fonts/GeistMono-Regular.ttf'),
  [FONT_NAME.GEIST_MONO_MEDIUM]: require('@/assets/fonts/GeistMono-Medium.ttf')
};

const hideSplash = async (): Promise<void> => {
  try {
    await SplashScreen.hideAsync();
  } catch (error) {
    logger.w(LOG_NAME.warning_log, {
      type: LOG_TYPE.hide_splash,
      error_kind: resolveErrorKind(error)
    });
  }
};

/** The controller handles every failure of its own actions, so `resume` never rejects. */
const hideSplashAndResume = async (): Promise<void> => {
  await hideSplash();
  await importController.resume();
};

/**
 * Holds the splash screen until the fonts are loaded and the stored import is read, then lets
 * the controller continue that import. The language is chosen before the first render, in App.tsx.
 */
export const useInitialAppLoading = (): boolean => {
  const [areFontsLoaded, fontError] = useFonts(FONT_FILES);
  const isRestored = useImportStore((state) => state.isRestored);
  const isReady = isRestored && (areFontsLoaded || fontError !== null);
  useEffect(() => {
    void importController.restore();
  }, []);
  useEffect(() => {
    if (!fontError) {
      return;
    }
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.load_fonts,
      error_kind: resolveErrorKind(fontError)
    });
  }, [fontError]);
  useEffect(() => {
    if (!isReady) {
      return;
    }
    void hideSplashAndResume();
  }, [isReady]);
  return isReady;
};
