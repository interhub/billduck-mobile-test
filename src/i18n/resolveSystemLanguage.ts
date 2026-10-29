import {getLocales} from 'expo-localization';
import {LANGUAGE} from '@/src/i18n/translations';

/** Russian when the first language of the system is Russian, English otherwise. */
export const resolveSystemLanguage = (): LANGUAGE => {
  const [firstLocale] = getLocales();
  if (firstLocale?.languageCode === LANGUAGE.RU) {
    return LANGUAGE.RU;
  }
  return LANGUAGE.EN;
};
