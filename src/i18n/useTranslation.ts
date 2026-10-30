import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {Translation} from '@/src/i18n/translationsEn';
import {useAppStateStore} from '@/src/stores/appStateStore';

/** The strings of the current interface language: `const {t} = useTranslation();`. */
export const useTranslation = (): {t: Translation; language: LANGUAGE} => {
  const language = useAppStateStore((state) => state.language);
  return {t: TRANSLATIONS[language], language};
};
