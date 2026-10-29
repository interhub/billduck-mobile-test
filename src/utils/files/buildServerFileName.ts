import {StatementFormat} from '@/src/types/importOperation';

const DATE_PART_DIGITS = 2;

const pad = (value: number): string => String(value).padStart(DATE_PART_DIGITS, '0');

/**
 * The name sent in X-File-Name: `statement-20261029-1432.pdf`, built from the local date and
 * time. Latin letters, digits, a hyphen and a dot only, so the real file name never leaves the
 * phone and an Android HTTP header never meets a Cyrillic letter or an emoji.
 */
export const buildServerFileName = (createdAt: Date, format: StatementFormat): string => {
  const datePart = `${createdAt.getFullYear()}${pad(createdAt.getMonth() + 1)}${pad(createdAt.getDate())}`;
  const timePart = `${pad(createdAt.getHours())}${pad(createdAt.getMinutes())}`;
  return `statement-${datePart}-${timePart}.${format}`;
};
