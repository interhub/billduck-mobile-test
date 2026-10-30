import {StatementFormat} from '@/src/types/importOperation';
import {padTwoDigits} from '@/src/utils/format/formatDate';

/**
 * The name sent in X-File-Name: `statement-20261029-1432.pdf`, built from the local date and
 * time. Latin letters, digits, a hyphen and a dot only, so the real file name never leaves the
 * phone and an Android HTTP header never meets a Cyrillic letter or an emoji.
 */
export const buildServerFileName = (createdAt: Date, format: StatementFormat): string => {
  const datePart = `${createdAt.getFullYear()}${padTwoDigits(createdAt.getMonth() + 1)}${padTwoDigits(createdAt.getDate())}`;
  const timePart = `${padTwoDigits(createdAt.getHours())}${padTwoDigits(createdAt.getMinutes())}`;
  return `statement-${datePart}-${timePart}.${format}`;
};
