import {LANGUAGE} from '@/src/i18n/translations';
import {formatStatementFormat, formatStatementTitle} from '@/src/utils/format/formatStatementTitle';

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

  it('names the format in capitals', () => {
    expect(formatStatementFormat('pdf')).toBe('PDF');
    expect(formatStatementFormat('csv')).toBe('CSV');
  });
});
