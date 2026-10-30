import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {
  closeOperation,
  currentOperation,
  dispatch,
  isCurrent,
  keepPayments,
  nowIso,
  readStore,
  recordDroppedAnswer,
  recordFor,
  recordNoAnswer
} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {ImportJob} from '@/src/types/importApi';
import {isReplacingPrevious} from '@/src/utils/import/importPhases';
import {keyLookupStatus, resolveDeletionOutcome} from '@/src/utils/import/importPolicy';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {JOB_ANSWER_VERDICT} from '@/src/utils/import/revisionGuard';
import {RunToken} from '@/src/utils/import/runToken';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

/** What the key says about the stored job: still ours (with its state), gone, silent, or over. */
type Ownership = {status: 'confirmed'; job: ImportJob} | {status: 'gone' | 'no_answer' | 'dropped'};

/**
 * A job answer goes through the reducer and gets a timeline row: applied, the same, stale or
 * dropped. `logType` names the request the answer came to.
 */
export const handleJobAnswer = async (
  context: ControllerContext,
  token: RunToken,
  job: ImportJob,
  logType: LOG_TYPE
): Promise<void> => {
  const hasItems = readStore(context).payments !== null;
  const transition = await dispatch(context, token, {type: 'job_answer', job, hasItems}, logType);
  const answerFields = {status: job.status, revision: job.revision};
  if (!transition?.accepted) {
    recordDroppedAnswer(context, token, job);
    return;
  }
  context.store.setState({lastAnswerAt: nowIso(context), isPollingSilent: false});
  if (transition.verdict === JOB_ANSWER_VERDICT.STALE) {
    recordFor(context, token, {event: TIMELINE_EVENT.STATUS_STALE_SKIPPED, ...answerFields});
    context.store.setState({staleSkippedCount: readStore(context).staleSkippedCount + 1});
    logger.w(LOG_NAME.warning_log, {type: logType, job_id: job.jobId, revision: job.revision});
    return;
  }
  if (transition.verdict === JOB_ANSWER_VERDICT.SAME) {
    recordFor(context, token, {event: TIMELINE_EVENT.STATUS_UNCHANGED, ...answerFields});
    return;
  }
  recordFor(context, token, {event: TIMELINE_EVENT.STATUS_APPLIED, ...answerFields});
  keepPayments(context, job);
};

/** The server said deleted: the import ends as "Deleted", unless it made room for a new one. */
export const finishDeleted = async (context: ControllerContext, token: RunToken) => {
  const operation = currentOperation(context, token);
  if (operation?.phase !== 'deleted') {
    return;
  }
  recordFor(context, token, {
    event: TIMELINE_EVENT.DELETED,
    status: IMPORT_STATUS.DELETED,
    revision: operation.revision
  });
  logger.d(LOG_NAME.debug_log, {
    type: LOG_TYPE.delete_import,
    job_id: operation.jobId,
    phase: operation.phase
  });
  const isReplacing = isReplacingPrevious(readStore(context).draft);
  const outcomeKind = resolveDeletionOutcome(isReplacing);
  await closeOperation(context, operation, outcomeKind, LOG_TYPE.delete_import);
};

/** The server no longer knows the job: the import is gone, never "Deleted". */
export const markGone = async (
  context: ControllerContext,
  token: RunToken,
  httpStatus: number,
  logType: LOG_TYPE
) => {
  const transition = await dispatch(context, token, {type: 'gone_on_server'}, logType);
  if (!transition?.accepted) {
    return;
  }
  recordFor(context, token, {event: TIMELINE_EVENT.GONE_ON_SERVER, httpStatus});
  logger.w(LOG_NAME.warning_log, {
    type: logType,
    job_id: transition.operation.jobId,
    http_status: httpStatus
  });
  await closeOperation(context, transition.operation, 'gone_on_server', logType);
};

/**
 * A reset mock numbers jobs from the start again, so a stored job id may already belong to
 * someone else's upload. Before a status read or a DELETE outside polling, the key must still
 * lead to our job; otherwise the import is gone and the other job is never read or deleted.
 */
export const confirmOwnership = async (
  context: ControllerContext,
  token: RunToken
): Promise<Ownership> => {
  const operation = currentOperation(context, token);
  if (!operation?.jobId) {
    return {status: 'dropped'};
  }
  const keyLookup = await context.api.getImportByKey(operation.idempotencyKey);
  if (!isCurrent(context, token)) {
    return {status: 'dropped'};
  }
  if (!keyLookup.success) {
    recordNoAnswer(context, token, LOG_TYPE.recover_by_key, keyLookup.error);
    return {status: 'no_answer'};
  }
  if (keyLookup.payload?.jobId === operation.jobId) {
    return {status: 'confirmed', job: keyLookup.payload};
  }
  const httpStatus = keyLookupStatus(keyLookup.payload);
  recordFor(context, token, {event: TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND, httpStatus});
  await markGone(context, token, httpStatus, LOG_TYPE.recover_by_key);
  return {status: 'gone'};
};
