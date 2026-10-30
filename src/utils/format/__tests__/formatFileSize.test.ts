import {LIMITS} from '@/src/constants/LIMITS';
import {LANGUAGE} from '@/src/i18n/translations';
import {formatExactBytes, formatFileSize, toKilobytes} from '@/src/utils/format/formatFileSize';

describe('formatFileSize', () => {
  it('uses bytes, kilobytes and megabytes in both languages', () => {
    expect(formatFileSize(112, LANGUAGE.EN)).toBe('112 B');
    expect(formatFileSize(2458, LANGUAGE.EN)).toBe('2.4 KB');
    expect(formatFileSize(2458, LANGUAGE.RU)).toBe('2,4 КБ');
    expect(formatFileSize(LIMITS.MAX_FILE_SIZE_BYTES, LANGUAGE.RU)).toBe('10,0 МБ');
  });

  it('shows the exact byte count for a size at the limit', () => {
    expect(formatExactBytes(10485771, LANGUAGE.EN)).toBe('10,485,771 bytes');
    expect(formatExactBytes(10485771, LANGUAGE.RU)).toBe('10\u00A0485\u00A0771 байт');
  });

  it('rounds the size to whole kilobytes for a log, never below one', () => {
    expect(toKilobytes(112)).toBe(1);
    expect(toKilobytes(2458)).toBe(2);
    expect(toKilobytes(LIMITS.MAX_FILE_SIZE_BYTES)).toBe(10240);
  });
});
