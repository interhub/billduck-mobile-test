import * as SystemUI from 'expo-system-ui';
import {useEffect} from 'react';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';

/** Paints the native root view in the theme background, so the dark theme has no light flashes. */
export const useSystemBackground = (): void => {
  const colors = useThemeColors();
  useEffect(() => {
    const paint = async () => {
      try {
        await SystemUI.setBackgroundColorAsync(colors.background);
      } catch (error) {
        logger.w(LOG_NAME.warning_log, {
          type: LOG_TYPE.system_background,
          error_kind: resolveErrorKind(error)
        });
      }
    };
    void paint();
  }, [colors.background]);
};
