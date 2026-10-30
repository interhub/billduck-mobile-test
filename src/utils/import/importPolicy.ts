import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {ApiError, ImportJob} from '@/src/types/importApi';
import {ImportOutcomeKind} from '@/src/types/importDraft';
import {ImportOperation, PendingCleanup} from '@/src/types/importOperation';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';

/**
 * A refusal the server would repeat for the same key and bytes (a 4xx other than a timeout or a
 * rate limit, as the classifier tells), so the upload is not tried again.
 */
export const isHardRejection = (error: ApiError): boolean => {
  return error.kind === ERROR_KIND.VALIDATION && error.httpStatus !== null;
};

/** The status a key lookup really got: 404, or 200 with a job that is not ours. */
export const keyLookupStatus = (found: ImportJob | null): number => {
  if (found) {
    return HTTP_STATUS.OK;
  }
  return HTTP_STATUS.NOT_FOUND;
};

/** The previous statement deleted to make room for a new one is not announced as "Deleted". */
export const resolveDeletionOutcome = (isReplacing: boolean): ImportOutcomeKind | null => {
  if (isReplacing) {
    return null;
  }
  return 'deleted';
};

/** The timeline row of one POST: the first send, or a repeat with the same key. */
export const resolveUploadEvent = (attempt: number | null): TIMELINE_EVENT => {
  if (attempt === null) {
    return TIMELINE_EVENT.UPLOAD_SENT;
  }
  return TIMELINE_EVENT.RESENT_SAME_KEY;
};

/** The stored version of the entry with the same key; every other entry stays as it is. */
export const replaceByKey = (entry: PendingCleanup, stored: PendingCleanup): PendingCleanup => {
  if (entry.idempotencyKey !== stored.idempotencyKey) {
    return entry;
  }
  return stored;
};

/** The private copies a launch keeps: only the one of the stored operation. */
export const listReferencedCopies = (operation: ImportOperation | null): string[] => {
  if (!operation) {
    return [];
  }
  return [operation.operationId];
};
