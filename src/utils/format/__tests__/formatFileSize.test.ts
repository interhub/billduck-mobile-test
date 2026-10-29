import {LIMITS} from '@/src/constants/LIMITS';
import {LANGUAGE} from '@/src/i18n/translations';
import {formatExactBytes, formatFileSize} from '@/src/utils/format/formatFileSize';
import {formatStatementTitle} from '@/src/utils/format/formatStatementTitle';

describe('formatFileSize', () => {
  it('uses bytes, kilobytes and megabytes in both languages', () => {
    expect(formatFileSize(112, LANGUAGE.EN)).toBe('112 B');
    expect(formatFileSize(2458, LANGUAGE.EN)).toBe('2.4 KB');
    expect(formatFileSize(2458, LANGUAGE.RU)).toBe('2,4 КБ');
    expect(formatFileSize(LIMITS.MAX_FILE_SIZE_BYTES, LANGUAGE.RU)).toBe('10,0 МБ');
  });

  it('shows the exact byte count for a size at the limit', () => {
    expect(formatExactBytes(10485771, LANGUAGE.EN)).toBe('10,485,771 bytes');
    expect(formatExactBytes(10485771, LANGUAGE.RU)).toBe('10 485 771 байт');
  });
});

describe('formatStatementTitle', () => {
  const source = {
    createdAt: new Date(2026, 9, 29, 14, 32).toISOString(),
    file: {sizeBytes: 2458, format: 'pdf' as const}
  };

  it('builds the on-screen title from the date, format and size, never from the file name', () => {
    expect(formatStatementTitle(source, LANGUAGE.EN)).toBe(
      'Statement · 29 Oct, 14:32 · PDF · 2.4 KB'
    );
    expect(formatStatementTitle(source, LANGUAGE.RU)).toBe(
      'Выписка · 29 окт, 14:32 · PDF · 2,4 КБ'
    );
  });
});
