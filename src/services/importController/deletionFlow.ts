import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {DELETION_STATUSES, IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {
  currentOperation,
  dispatch,
  isCurrent,
  readStore,
  recordFor,
  tokenFor
} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {
  confirmOwnership,
  handleJobAnswer,
  markGone
} from '@/src/services/importController/jobAnswers';
import {continueJob} from '@/src/services/importController/jobPolling';
import {ApiResult, ImportJob} from '@/src/types/importApi';
import {ImportOperation} from '@/src/types/importOperation';
import {canDeleteOnServer} from '@/src/utils/import/importPhases';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {runIdOf, RunToken} from '@/src/utils/import/runToken';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

type DeletionResult = 'deleted' | 'gone' | 'failed' | 'stopped';

/** A DELETE that got no answer: the job state decides whether the deletion went through. */
const settleUnansweredDelete = async (
  context: ControllerContext,
  token: RunToken,
  jobId: string
): Promise<'settled' | 'not_deleted'> => {
  const jobRead = await context.api.getImport(jobId);
  if (!isCurrent(context, token)) {
    return 'settled';
  }
  if (!jobRead.success) {
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.delete_import,
      job_id: jobId,
      error_kind: jobRead.error.kind,
      http_status: jobRead.error.httpStatus
    });
    return 'not_deleted';
  }
  if (jobRead.payload === null) {
    await markGone(context, token, HTTP_STATUS.NOT_FOUND, LOG_TYPE.delete_import);
    return 'settled';
  }
  if (!DELETION_STATUSES.includes(jobRead.payload.status)) {
    return 'not_deleted';
  }
  await handleJobAnswer(context, token, jobRead.payload, LOG_TYPE.delete_import);
  await continueJob(context, token);
  return 'settled';
};

/** 202 starts the wait for `deleted`; a 404 means the server no longer knows the job. */
const acceptDeleteAnswer = async (
  context: ControllerContext,
  token: RunToken,
  job: ImportJob | null
) => {
  if (job === null) {
    await markGone(context, token, HTTP_STATUS.NOT_FOUND, LOG_TYPE.delete_import);
    return;
  }
  recordFor(context, token, {
    event: TIMELINE_EVENT.DELETE_ACCEPTED,
    status: job.status,
    revision: job.revision,
    httpStatus: HTTP_STATUS.ACCEPTED
  });
  // The answer to a DELETE only starts the deletion: "Deleted" waits for a GET that says so.
  if (job.status === IMPORT_STATUS.DELETING) {
    await handleJobAnswer(context, token, job, LOG_TYPE.delete_import);
  }
  await continueJob(context, token);
};

/** A refusal, or a silence the job read cannot settle, leaves the data on the server. */
const handleDeleteAnswer = async (
  context: ControllerContext,
  token: RunToken,
  jobId: string,
  deleteAnswer: ApiResult<ImportJob | null>
) => {
  if (deleteAnswer.success) {
    await acceptDeleteAnswer(context, token, deleteAnswer.payload);
    return;
  }
  const {kind, httpStatus} = deleteAnswer.error;
  logger.e(LOG_NAME.error_log, {
    type: LOG_TYPE.delete_import,
    job_id: jobId,
    error_kind: kind,
    http_status: httpStatus
  });
  if (httpStatus === null) {
    const unanswered = await settleUnansweredDelete(context, token, jobId);
    if (unanswered === 'settled') {
      return;
    }
  }
  recordFor(context, token, {event: TIMELINE_EVENT.DELETE_FAILED, httpStatus, errorKind: kind});
  await dispatch(context, token, {type: 'delete_failed'}, LOG_TYPE.delete_import);
};

/** The DELETE goes out only once the key still leads to our job. */
const sendDelete = async (
  context: ControllerContext,
  token: RunToken,
  requested: ImportOperation
) => {
  if (!requested.jobId || !requested.deleteKey) {
    return;
  }
  const ownership = await confirmOwnership(context, token);
  if (ownership.status === 'no_answer') {
    recordFor(context, token, {event: TIMELINE_EVENT.DELETE_FAILED});
    await dispatch(context, token, {type: 'delete_failed'}, LOG_TYPE.delete_import);
    return;
  }
  if (ownership.status !== 'confirmed') {
    return;
  }
  recordFor(context, token, {event: TIMELINE_EVENT.DELETE_SENT});
  const deleteAnswer = await context.api.deleteImport(requested.jobId, requested.deleteKey);
  if (isCurrent(context, token)) {
    await handleDeleteAnswer(context, token, requested.jobId, deleteAnswer);
  }
};

/**
 * DELETE with the delete key stored before the request: the key of the first attempt, reused by
 * every retry. Only a later GET with `deleted` ends it; a 503 or any other refusal leaves the
 * data on the server and says so.
 */
export const runDeletion = async (context: ControllerContext, token: RunToken): Promise<void> => {
  await context.deletionFlight(runIdOf(token), async () => {
    const operation = currentOperation(context, token);
    if (!operation) {
      return;
    }
    const requested = await dispatch(
      context,
      token,
      {type: 'delete_requested', deleteKey: operation.deleteKey ?? context.createUuid()},
      LOG_TYPE.delete_import
    );
    if (requested?.accepted) {
      await sendDelete(context, token, requested.operation);
    }
  });
};

/** The deletion settled one way or the other; null while it still runs. */
const readDeletionResult = (
  context: ControllerContext,
  operationId: string
): DeletionResult | null => {
  const {operation, outcome} = readStore(context);
  if (!operation || operation.operationId !== operationId) {
    if (outcome?.kind === 'gone_on_server' && outcome.operation.operationId === operationId) {
      return 'gone';
    }
    return 'deleted';
  }
  if (operation.phase === 'delete_failed' || operation.phase === 'server_unavailable') {
    return 'failed';
  }
  return null;
};

/** Resolves once the deletion of the operation settles one way or the other. */
const waitForDeletion = (
  context: ControllerContext,
  operationId: string
): Promise<DeletionResult> =>
  new Promise((resolve) => {
    const immediate = readDeletionResult(context, operationId);
    if (immediate) {
      resolve(immediate);
      return;
    }
    const unsubscribe = context.store.subscribe(() => {
      const deletionResult = readDeletionResult(context, operationId);
      if (deletionResult) {
        unsubscribe();
        resolve(deletionResult);
      }
    });
  });

/** Deletes the current statement on the server and waits for the confirmation. */
export const deleteImport = async (context: ControllerContext): Promise<DeletionResult> => {
  const operation = readStore(context).operation;
  if (!operation || !canDeleteOnServer(operation)) {
    return 'stopped';
  }
  const writeFailuresBefore = context.runtime.writeFailures();
  await runDeletion(context, tokenFor(context, operation.operationId));
  const settled = readDeletionResult(context, operation.operationId);
  if (settled) {
    return settled;
  }
  // A write that failed left the operation where it was: nothing will move it on its own.
  if (context.runtime.writeFailures() !== writeFailuresBefore) {
    return 'failed';
  }
  return waitForDeletion(context, operation.operationId);
};
