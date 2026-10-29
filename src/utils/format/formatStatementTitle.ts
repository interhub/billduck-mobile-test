import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {StatementFile, StatementFormat} from '@/src/types/importOperation';
import {formatLocalDateTime} from '@/src/utils/format/formatDate';
import {formatFileSize} from '@/src/utils/format/formatFileSize';

const FORMAT_LABEL: Record<StatementFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV'
};

type TitleSource = {
  createdAt: string;
  file: StatementFile;
};

export const formatStatementFormat = (format: StatementFormat): string => FORMAT_LABEL[format];

/**
 * The on-screen name of a statement, built at render time in the current language and never
 * stored: "Statement · 29 Oct, 14:32 · PDF · 2.4 KB" / "Выписка · 29 окт, 14:32 · PDF · 2,4 КБ".
 */
export const formatStatementTitle = (
  {createdAt, file}: TitleSource,
  language: LANGUAGE
): string => {
  return [
    TRANSLATIONS[language].format.statementWord,
    formatLocalDateTime(createdAt, language),
    FORMAT_LABEL[file.format],
    formatFileSize(file.sizeBytes, language)
  ].join(' · ');
};
