import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {StatementFile, StatementFormat} from '@/src/types/importOperation';
import {formatLocalDateTime} from '@/src/utils/format/formatDate';
import {formatFileSize} from '@/src/utils/format/formatFileSize';

type TitleSource = {
  createdAt: string;
  file: StatementFile;
};

/** The format as the screen names it, the same in both languages: "PDF", "CSV". */
export const formatStatementFormat = (format: StatementFormat): string => format.toUpperCase();

/**
 * The on-screen name of a statement, built at render time in the current language and never
 * stored: "Statement · 29 Oct, 14:32 · PDF · 2.4 KB" / "Выписка · 29 окт, 14:32 · PDF · 2,4 КБ".
 */
export const formatStatementTitle = (
  {createdAt, file}: TitleSource,
  language: LANGUAGE
): string => {
  const {statementWord, titleSeparator} = TRANSLATIONS[language].format;
  return [
    statementWord,
    formatLocalDateTime(createdAt, language),
    formatStatementFormat(file.format),
    formatFileSize(file.sizeBytes, language)
  ].join(titleSeparator);
};
