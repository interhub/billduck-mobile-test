import {StatementFormat} from '@/src/types/importOperation';
import {formatFileStamp} from '@/src/utils/format/formatFileStamp';

/**
 * The name sent in X-File-Name: `statement-20261029-1432.pdf`, built from the local date and
 * time. Latin letters, digits, a hyphen and a dot only, so the real file name never leaves the
 * phone and an Android HTTP header never meets a Cyrillic letter or an emoji.
 */
export const buildServerFileName = (createdAt: Date, format: StatementFormat): string => {
  return `statement-${formatFileStamp(createdAt)}.${format}`;
};
