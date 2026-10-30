import {BYTE_UNITS} from '@/src/constants/BYTE_UNITS';
import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {groupDigits} from '@/src/utils/format/formatMoney';

const formatOneDecimal = (value: number, decimalSeparator: string): string => {
  return value.toFixed(1).replace('.', decimalSeparator);
};

/** The size in whole kilobytes, at least 1: the `size_kb` field of a log. */
export const toKilobytes = (sizeBytes: number): number => {
  return Math.max(1, Math.round(sizeBytes / BYTE_UNITS.KILOBYTE));
};

/** "112 B", "2.4 KB", "10.0 MB" in English; "112 Б", "2,4 КБ", "10,0 МБ" in Russian. */
export const formatFileSize = (sizeBytes: number, language: LANGUAGE): string => {
  const {bytes, kilobytes, megabytes, decimalSeparator} = TRANSLATIONS[language].format;
  if (sizeBytes < BYTE_UNITS.KILOBYTE) {
    return `${sizeBytes} ${bytes}`;
  }
  if (sizeBytes < BYTE_UNITS.MEGABYTE) {
    return `${formatOneDecimal(sizeBytes / BYTE_UNITS.KILOBYTE, decimalSeparator)} ${kilobytes}`;
  }
  return `${formatOneDecimal(sizeBytes / BYTE_UNITS.MEGABYTE, decimalSeparator)} ${megabytes}`;
};

/** The exact byte count, for a size right at the limit: "10,485,771 bytes" / "10 485 771 байт". */
export const formatExactBytes = (sizeBytes: number, language: LANGUAGE): string => {
  const {groupSeparator, exactBytes} = TRANSLATIONS[language].format;
  return exactBytes(groupDigits(String(sizeBytes), groupSeparator));
};
