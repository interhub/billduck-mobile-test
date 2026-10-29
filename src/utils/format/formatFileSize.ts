import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {groupDigits} from '@/src/utils/format/formatMoney';

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = 1024 * 1024;

const formatOneDecimal = (value: number, decimalSeparator: string): string => {
  return value.toFixed(1).replace('.', decimalSeparator);
};

/** "112 B", "2.4 KB", "10.0 MB" in English; "112 Б", "2,4 КБ", "10,0 МБ" in Russian. */
export const formatFileSize = (sizeBytes: number, language: LANGUAGE): string => {
  const {bytes, kilobytes, megabytes, decimalSeparator} = TRANSLATIONS[language].format;
  if (sizeBytes < BYTES_PER_KILOBYTE) {
    return `${sizeBytes} ${bytes}`;
  }
  if (sizeBytes < BYTES_PER_MEGABYTE) {
    return `${formatOneDecimal(sizeBytes / BYTES_PER_KILOBYTE, decimalSeparator)} ${kilobytes}`;
  }
  return `${formatOneDecimal(sizeBytes / BYTES_PER_MEGABYTE, decimalSeparator)} ${megabytes}`;
};

/** The exact byte count, for a size right at the limit: "10,485,771 bytes" / "10 485 771 байт". */
export const formatExactBytes = (sizeBytes: number, language: LANGUAGE): string => {
  const {groupSeparator, exactBytes} = TRANSLATIONS[language].format;
  return exactBytes(groupDigits(String(sizeBytes), groupSeparator));
};
