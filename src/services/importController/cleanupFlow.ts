import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {
  addPendingCleanup,
  closeOperation,
  readStore,
  record,
  updateCleanups,
  waitInForeground
} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {ApiResult, ImportJob} from '@/src/types/importApi';
import {PendingCleanup} from '@/src/types/importOperation';
import {isAwaitingUploadOutcome} from '@/src/utils/import/importPhases';
import {replaceByKey} from '@/src/utils/import/importPolicy';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {runDelayLadder} from '@/src/utils/promise/runDelayLadder';

/** What the server holds of a cancelled upload: its job, nothing, or it did not answer. */
type CancelledUpload =
  {status: 'found'; job: ImportJob} | {status: 'not_found'} | {status: 'no_answer'};

/** A cleanup entry is cleared once the server holds nothing of its upload, else kept for later. */
type CleanupStep = 'cleared' | 'kept';

const toCancelledUpload = (keyLookup: ApiResult<ImportJob | null>): CancelledUpload => {
  if (!keyLookup.success) {
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.cleanup_upload,
      error_kind: keyLookup.error.kind,
      http_status: keyLookup.error.httpStatus
    });
    return {status: 'no_answer'};
  }
  if (keyLookup.payload === null) {
    return {status: 'not_found'};
  }
  return {status: 'found', job: keyLookup.payload};
};

/**
 * Reads a cancelled upload by its key. Its POST may still be on its way, so a miss gets one
 * more look after CLEANUP_RECHECK_DELAY_MS before the key is forgotten.
 */
const findCancelledUpload = async (
  context: ControllerContext,
  idempotencyKey: string
): Promise<CancelledUpload> => {
  const firstLook = toCancelledUpload(await context.api.getImportByKey(idempotencyKey));
  if (firstLook.status !== 'not_found') {
    return firstLook;
  }
  await waitInForeground(context, LIMITS.CLEANUP_RECHECK_DELAY_MS);
  return toCancelledUpload(await context.api.getImportByKey(idempotencyKey));
};

/** One read of a cancelled upload's job: deleted, no answer, or null to read again. */
const readCleanupJob = async (
  context: ControllerContext,
  jobId: string,
  attempt: number
): Promise<'deleted' | 'no_answer' | null> => {
  const jobRead = await context.api.getImport(jobId);
  if (!jobRead.success) {
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.cleanup_upload,
      job_id: jobId,
      error_kind: jobRead.error.kind,
      http_status: jobRead.error.httpStatus,
      attempt
    });
    return 'no_answer';
  }
  if (jobRead.payload === null || jobRead.payload.status === IMPORT_STATUS.DELETED) {
    return 'deleted';
  }
  return null;
};

/** Reads a cancelled upload's job until the deletion is confirmed; never in the background. */
const waitForCleanupDeleted = async (context: ControllerContext, jobId: string) => {
  const settled = await runDelayLadder(
    Array.from({length: LIMITS.CLEANUP_POLL_ATTEMPTS}, () => LIMITS.POLL_INTERVAL_MS),
    (attempt) => readCleanupJob(context, jobId, attempt),
    (durationMs) => waitInForeground(context, durationMs)
  );
  return settled === 'deleted';
};

/** The entry's delete key is stored before its first DELETE; a job already deleting needs none. */
const requestCleanupDelete = async (
  context: ControllerContext,
  cleanup: PendingCleanup,
  job: ImportJob
): Promise<boolean> => {
  const deleteKey = cleanup.deleteKey ?? context.createUuid();
  if (!cleanup.deleteKey) {
    const stored = {...cleanup, jobId: job.jobId, deleteKey};
    const isStored = await updateCleanups(
      context,
      (cleanups) => cleanups.map((entry) => replaceByKey(entry, stored)),
      LOG_TYPE.cleanup_upload
    );
    if (!isStored) {
      return false;
    }
  }
  if (job.status === IMPORT_STATUS.DELETING) {
    return true;
  }
  const deleteAnswer = await context.api.deleteImport(job.jobId, deleteKey);
  if (deleteAnswer.success) {
    return true;
  }
  logger.e(LOG_NAME.error_log, {
    type: LOG_TYPE.cleanup_upload,
    job_id: job.jobId,
    error_kind: deleteAnswer.error.kind,
    http_status: deleteAnswer.error.httpStatus
  });
  return false;
};

/** One cleanup entry: cleared once the server holds nothing of that upload. */
const cleanUp = async (
  context: ControllerContext,
  cleanup: PendingCleanup
): Promise<CleanupStep> => {
  const cancelled = await findCancelledUpload(context, cleanup.idempotencyKey);
  if (cancelled.status === 'no_answer') {
    return 'kept';
  }
  if (cancelled.status === 'not_found') {
    record(context, {
      operationId: null,
      event: TIMELINE_EVENT.CLEANUP_NOT_FOUND,
      httpStatus: HTTP_STATUS.NOT_FOUND
    });
    return 'cleared';
  }
  const {job} = cancelled;
  if (job.status === IMPORT_STATUS.DELETED) {
    return 'cleared';
  }
  const isDeleteSent = await requestCleanupDelete(context, cleanup, job);
  if (!isDeleteSent) {
    return 'kept';
  }
  const isDeleted = await waitForCleanupDeleted(context, job.jobId);
  if (!isDeleted) {
    return 'kept';
  }
  record(context, {
    operationId: null,
    event: TIMELINE_EVENT.CLEANUP_DELETED,
    status: IMPORT_STATUS.DELETED
  });
  logger.d(LOG_NAME.debug_log, {type: LOG_TYPE.cleanup_upload, job_id: job.jobId});
  return 'cleared';
};

/** Deletes on the server every upload that was cancelled before its outcome was known. */
const cleanUpAll = async (context: ControllerContext) => {
  for (const cleanup of [...readStore(context).pendingCleanups]) {
    const step = await cleanUp(context, cleanup);
    if (step === 'cleared') {
      await updateCleanups(
        context,
        (cleanups) => cleanups.filter((entry) => entry.idempotencyKey !== cleanup.idempotencyKey),
        LOG_TYPE.cleanup_upload
      );
    }
  }
};

/** A request that comes while a pass runs is not lost: the running pass goes over the list again. */
export const runCleanups = (context: ControllerContext): Promise<void> =>
  context.cleanupRunner(() => cleanUpAll(context));

/**
 * "Cancel upload": the private copy goes at once, the key moves to the cleanup list, and the
 * upload is deleted from the server as soon as it answers, if the file ever got there.
 */
export const cancelUpload = async (context: ControllerContext) => {
  const operation = readStore(context).operation;
  if (!operation || !isAwaitingUploadOutcome(operation)) {
    return;
  }
  context.runtime.abortUpload();
  const isListed = await addPendingCleanup(
    context,
    operation.idempotencyKey,
    LOG_TYPE.cleanup_upload
  );
  if (!isListed) {
    return;
  }
  record(context, {operationId: operation.operationId, event: TIMELINE_EVENT.UPLOAD_CANCELLED});
  await closeOperation(context, operation, 'upload_cancelled', LOG_TYPE.cleanup_upload);
  void runCleanups(context);
};
