import {Translation, TRANSLATIONS_EN} from '@/src/i18n/translationsEn';
import {TRANSLATIONS_RU} from '@/src/i18n/translationsRu';

export enum LANGUAGE {
  EN = 'en',
  RU = 'ru'
}

/** Every interface string in both languages, with the same keys. */
export const TRANSLATIONS: Record<LANGUAGE, Translation> = {
  [LANGUAGE.EN]: TRANSLATIONS_EN,
  [LANGUAGE.RU]: TRANSLATIONS_RU
};
