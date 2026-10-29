import {LANGUAGE, Translation, TRANSLATIONS} from '@/src/i18n/translations';
import {useAppStateStore} from '@/src/stores/appStateStore';

/** The strings of the current interface language: `const {t} = useTranslation();`. */
export const useTranslation = (): {t: Translation; language: LANGUAGE} => {
  const language = useAppStateStore((state) => state.language);
  return {t: TRANSLATIONS[language], language};
};
