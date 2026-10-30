import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {
  addPendingCleanup,
  currentOperation,
  dispatch,
  isCurrent,
  keepPayments,
  nowIso,
  recordDroppedAnswer,
  recordFor,
  recordNoAnswer,
  waitInForeground
} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {continueJob} from '@/src/services/importController/jobPolling';
import {ApiResult, ImportJob} from '@/src/types/importApi';
import {ImportOperation} from '@/src/types/importOperation';
import {toKilobytes} from '@/src/utils/format/formatFileSize';
import {isHardRejection, resolveUploadEvent} from '@/src/utils/import/importPolicy';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {runIdOf, RunToken} from '@/src/utils/import/runToken';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {runDelayLadder} from '@/src/utils/promise/runDelayLadder';

/** One POST settled the upload one way or the other, or left its outcome unknown. */
type UploadAttemptResult = 'settled' | 'unknown';

/** What a lookup by key found for an upload whose outcome was unknown. */
type UploadLookup = 'found' | 'not_found' | 'no_answer' | 'dropped';

/** The server confirmed a job for the upload: the private copy is no longer needed. */
const acceptJob = async (
  context: ControllerContext,
  token: RunToken,
  job: ImportJob,
  logType: LOG_TYPE
) => {
  const transition = await dispatch(context, token, {type: 'upload_accepted', job}, logType);
  if (!transition?.accepted) {
    recordDroppedAnswer(context, token, job);
    return;
  }
  context.files.removeCopy(token.operationId);
  context.runtime.rememberVerifiedJob(token.operationId);
  context.store.setState({lastAnswerAt: nowIso(context)});
  keepPayments(context, job);
  await continueJob(context, token);
};

/** The private copy is gone while nobody knows whether the server got the file. */
const markFileMissing = async (
  context: ControllerContext,
  token: RunToken,
  operation: ImportOperation
) => {
  const isListed = await addPendingCleanup(
    context,
    operation.idempotencyKey,
    LOG_TYPE.create_import
  );
  if (!isListed) {
    return;
  }
  recordFor(context, token, {event: TIMELINE_EVENT.FILE_MISSING});
  await dispatch(context, token, {type: 'file_missing'}, LOG_TYPE.create_import);
};

/** The POST itself; "Cancel upload" and "Reset all" abort it while it runs. */
const sendUpload = (
  context: ControllerContext,
  operation: ImportOperation
): Promise<ApiResult<ImportJob>> => {
  const upload = new AbortController();
  return context.runtime.whileUploading(upload, () =>
    context.api.createImport({
      fileUri: context.files.getCopyUri(operation.operationId),
      idempotencyKey: operation.idempotencyKey,
      serverFileName: operation.serverFileName,
      signal: upload.signal
    })
  );
};

/** 202 accepts the job; a refusal the server would repeat fails the upload; the rest is unknown. */
const settleUploadAnswer = async (
  context: ControllerContext,
  token: RunToken,
  uploadAnswer: ApiResult<ImportJob>,
  attempt: number | null
): Promise<UploadAttemptResult> => {
  if (uploadAnswer.success) {
    recordFor(context, token, {
      event: TIMELINE_EVENT.UPLOAD_ACCEPTED,
      status: uploadAnswer.payload.status,
      revision: uploadAnswer.payload.revision,
      httpStatus: HTTP_STATUS.ACCEPTED
    });
    await acceptJob(context, token, uploadAnswer.payload, LOG_TYPE.create_import);
    return 'settled';
  }
  const {kind, httpStatus} = uploadAnswer.error;
  logger.e(LOG_NAME.error_log, {
    type: LOG_TYPE.create_import,
    error_kind: kind,
    http_status: httpStatus,
    attempt
  });
  if (isHardRejection(uploadAnswer.error)) {
    recordFor(context, token, {event: TIMELINE_EVENT.UPLOAD_REJECTED, httpStatus, errorKind: kind});
    await dispatch(context, token, {type: 'upload_rejected', httpStatus}, LOG_TYPE.create_import);
    context.files.removeCopy(token.operationId);
    return 'settled';
  }
  recordFor(context, token, {
    event: TIMELINE_EVENT.UPLOAD_ANSWER_LOST,
    errorKind: kind,
    httpStatus,
    attempt
  });
  await dispatch(context, token, {type: 'upload_outcome_unknown'}, LOG_TYPE.create_import);
  return 'unknown';
};

/** One POST of the stored operation with its stored key and the same bytes. */
const postOnce = async (
  context: ControllerContext,
  token: RunToken,
  attempt: number | null
): Promise<UploadAttemptResult> => {
  const operation = currentOperation(context, token);
  if (!operation) {
    return 'settled';
  }
  const copyPresence = context.files.hasCopy(operation.operationId);
  // A copy that could not be read cannot be sent either: it takes the path of a missing one.
  if (!copyPresence.success || !copyPresence.payload) {
    await markFileMissing(context, token, operation);
    return 'settled';
  }
  recordFor(context, token, {event: resolveUploadEvent(attempt), attempt});
  logger.d(LOG_NAME.debug_log, {
    type: LOG_TYPE.create_import,
    format: operation.file.format,
    size_kb: toKilobytes(operation.file.sizeBytes),
    attempt
  });
  const uploadAnswer = await sendUpload(context, operation);
  if (!isCurrent(context, token)) {
    recordDroppedAnswer(context, token);
    return 'settled';
  }
  return settleUploadAnswer(context, token, uploadAnswer, attempt);
};

/** One lookup by key of an upload whose outcome is unknown; a found job is accepted at once. */
export const lookUpUploadByKey = async (
  context: ControllerContext,
  token: RunToken,
  attempt: number | null
): Promise<UploadLookup> => {
  const operation = currentOperation(context, token);
  if (!operation) {
    return 'dropped';
  }
  const keyLookup = await context.api.getImportByKey(operation.idempotencyKey);
  if (!isCurrent(context, token)) {
    return 'dropped';
  }
  if (!keyLookup.success) {
    recordNoAnswer(context, token, LOG_TYPE.recover_by_key, keyLookup.error, attempt);
    return 'no_answer';
  }
  const job = keyLookup.payload;
  if (!job) {
    recordFor(context, token, {
      event: TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND,
      httpStatus: HTTP_STATUS.NOT_FOUND,
      attempt
    });
    return 'not_found';
  }
  recordFor(context, token, {
    event: TIMELINE_EVENT.KEY_LOOKUP_FOUND,
    status: job.status,
    revision: job.revision,
    attempt
  });
  logger.d(LOG_NAME.debug_log, {type: LOG_TYPE.recover_by_key, job_id: job.jobId, attempt});
  await acceptJob(context, token, job, LOG_TYPE.recover_by_key);
  return 'found';
};

/** One recovery attempt: 'settled' ends the ladder, null goes on after the next pause. */
const recoverOnce = async (
  context: ControllerContext,
  token: RunToken,
  attempt: number
): Promise<'settled' | null> => {
  const lookup = await lookUpUploadByKey(context, token, attempt);
  if (lookup === 'no_answer') {
    return null;
  }
  if (lookup !== 'not_found') {
    return 'settled';
  }
  const upload = await postOnce(context, token, attempt);
  if (upload === 'unknown') {
    return null;
  }
  return 'settled';
};

/**
 * After a lost answer: a lookup by key after each pause of RECOVERY_DELAYS_MS. A 404 sends the
 * same key and the same bytes again. Called only for an upload this launch sent itself, so
 * nothing here ever creates a second job.
 */
export const recover = async (context: ControllerContext, token: RunToken): Promise<void> => {
  await context.recoveryFlight(runIdOf(token), async () => {
    const settled = await runDelayLadder(
      LIMITS.RECOVERY_DELAYS_MS,
      (attempt) => recoverOnce(context, token, attempt),
      (durationMs) => waitInForeground(context, durationMs)
    );
    if (settled === null && isCurrent(context, token)) {
      recordFor(context, token, {event: TIMELINE_EVENT.SERVER_UNAVAILABLE});
      await dispatch(context, token, {type: 'recovery_exhausted'}, LOG_TYPE.recover_by_key);
    }
  });
};

/** The first POST of a send or a resend; a lost answer starts the automatic recovery by key. */
export const sendAndRecover = async (context: ControllerContext, token: RunToken) => {
  const upload = await postOnce(context, token, null);
  if (upload === 'unknown') {
    await recover(context, token);
  }
};
