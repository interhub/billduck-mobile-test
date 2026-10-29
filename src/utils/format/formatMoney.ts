import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {RecurringItem} from '@/src/types/importApi';

const MINOR_UNITS_PER_MAJOR = 100;
const MINOR_DIGITS = 2;

/** Splits the digits into thousands: 12345 -> 12,345 or 12 345. */
export const groupDigits = (digits: string, separator: string): string => {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
};

const resolveSign = (amountMinor: number): string => {
  if (amountMinor < 0) {
    return '-';
  }
  return '';
};

/** 15199 -> "151.99" in English, "151,99" in Russian; the amount stays an integer until here. */
export const formatMinorAmount = (amountMinor: number, language: LANGUAGE): string => {
  const {decimalSeparator, groupSeparator} = TRANSLATIONS[language].format;
  const absoluteMinor = Math.abs(Math.trunc(amountMinor));
  const major = Math.floor(absoluteMinor / MINOR_UNITS_PER_MAJOR);
  const minor = String(absoluteMinor % MINOR_UNITS_PER_MAJOR).padStart(MINOR_DIGITS, '0');
  return `${resolveSign(amountMinor)}${groupDigits(String(major), groupSeparator)}${decimalSeparator}${minor}`;
};

/** "19.99 AUD" / "19,99 AUD". */
export const formatMoney = (amountMinor: number, currency: string, language: LANGUAGE): string => {
  return `${formatMinorAmount(amountMinor, language)} ${currency}`;
};

/** Sums integer minor units, never floats. */
export const sumMinorAmounts = (items: RecurringItem[]): number => {
  return items.reduce((total, paymentItem) => total + paymentItem.amountMinor, 0);
};

/** "151.99 AUD / month" / "151,99 AUD в месяц". */
export const formatMonthlyTotal = (
  items: RecurringItem[],
  currency: string,
  language: LANGUAGE
): string => {
  return TRANSLATIONS[language].format.perMonth(
    formatMoney(sumMinorAmounts(items), currency, language)
  );
};
