import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';

/** "Monthly" / "Ежемесячно" for the cadences the app knows, the server word otherwise. */
export const describeCadence = (cadence: string, language: LANGUAGE): string => {
  const known = TRANSLATIONS[language].importResult.cadence;
  if (cadence === 'monthly' || cadence === 'weekly' || cadence === 'yearly') {
    return known[cadence];
  }
  return cadence;
};
