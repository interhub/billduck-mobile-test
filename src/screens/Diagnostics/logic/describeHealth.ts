import {Translation} from '@/src/i18n/translationsEn';

export type HealthState = 'checking' | 'ok' | 'down';

export const describeHealth = (health: HealthState, translations: Translation): string => {
  if (health === 'ok') {
    return translations.diagnostics.healthOk;
  }
  if (health === 'down') {
    return translations.diagnostics.healthDown;
  }
  return translations.diagnostics.healthChecking;
};
