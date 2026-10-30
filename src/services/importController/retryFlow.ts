import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {DELETION_STATUSES} from '@/src/constants/IMPORT_STATUS';
import {
  dispatch,
  isCurrent,
  readStore,
  recordFor,
  recordNoAnswer,
  tokenFor
} from '@/src/services/importController/controllerCore';
import {runDeletion} from '@/src/services/importController/deletionFlow';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {
  confirmOwnership,
  handleJobAnswer,
  markGone
} from '@/src/services/importController/jobAnswers';
import {continueJob} from '@/src/services/importController/jobPolling';
import {replaceAndSend} from '@/src/services/importController/sendFlow';
import {lookUpUploadByKey, recover} from '@/src/services/importController/uploadFlow';
import {hasServerJob} from '@/src/utils/import/importPhases';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {resolveRetryPlan, RETRY_ACTION} from '@/src/utils/import/retryAction';
import {RunToken} from '@/src/utils/import/runToken';
import {LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

/** A stored job is trusted after a restart only if its key still leads to it: a reset mock reuses ids. */
export const verifyJob = async (context: ControllerContext, token: RunToken) => {
  const ownership = await confirmOwnership(context, token);
  if (ownership.status === 'no_answer') {
    await dispatch(context, token, {type: 'connection_lost'}, LOG_TYPE.recover_by_key);
    return;
  }
  if (ownership.status !== 'confirmed') {
    return;
  }
  context.runtime.rememberVerifiedJob(token.operationId);
  recordFor(context, token, {
    event: TIMELINE_EVENT.KEY_LOOKUP_FOUND,
    status: ownership.job.status,
    revision: ownership.job.revision
  });
  await handleJobAnswer(context, token, ownership.job, LOG_TYPE.recover_by_key);
  const phaseAfterAnswer = readStore(context).operation?.phase;
  if (phaseAfterAnswer === 'deleting' && !DELETION_STATUSES.includes(ownership.job.status)) {
    recordFor(context, token, {event: TIMELINE_EVENT.DELETE_FAILED});
    await dispatch(context, token, {type: 'delete_failed'}, LOG_TYPE.delete_import);
    return;
  }
  await continueJob(context, token);
};

/** An upload with an unknown outcome after a restart: a lookup by key only, never a POST. */
export const checkUploadAfterRestart = async (context: ControllerContext, token: RunToken) => {
  await dispatch(context, token, {type: 'recovery_started'}, LOG_TYPE.recover_by_key);
  const lookup = await lookUpUploadByKey(context, token, null);
  if (lookup === 'no_answer') {
    await dispatch(context, token, {type: 'recovery_exhausted'}, LOG_TYPE.recover_by_key);
    return;
  }
  if (lookup === 'not_found') {
    await dispatch(context, token, {type: 'not_received'}, LOG_TYPE.recover_by_key);
  }
};

/** One status read outside polling: pull to refresh, opening the result, Retry. */
const readJobAndContinue = async (context: ControllerContext, token: RunToken) => {
  const ownership = await confirmOwnership(context, token);
  if (ownership.status !== 'confirmed') {
    return;
  }
  const jobRead = await context.api.getImport(ownership.job.jobId);
  if (!isCurrent(context, token)) {
    return;
  }
  if (!jobRead.success) {
    recordNoAnswer(context, token, LOG_TYPE.poll_job, jobRead.error);
    return;
  }
  if (jobRead.payload === null) {
    await markGone(context, token, HTTP_STATUS.NOT_FOUND, LOG_TYPE.poll_job);
    return;
  }
  await handleJobAnswer(context, token, jobRead.payload, LOG_TYPE.poll_job);
  await continueJob(context, token);
};

/** "Retry": the blocked replacement, a failed deletion, or a silent server. */
export const retry = async (context: ControllerContext): Promise<void> => {
  const {draft, operation} = readStore(context);
  const plan = resolveRetryPlan({draft, operation, launchMemory: context.runtime.launchMemory});
  if (!plan) {
    return;
  }
  if (plan.action === RETRY_ACTION.REPLACE) {
    await replaceAndSend(context, plan.draft);
    return;
  }
  const token = tokenFor(context, plan.operationId);
  switch (plan.action) {
    case RETRY_ACTION.DELETE:
      await runDeletion(context, token);
      return;
    case RETRY_ACTION.READ_JOB:
      await readJobAndContinue(context, token);
      return;
    case RETRY_ACTION.VERIFY_JOB:
      await verifyJob(context, token);
      return;
    case RETRY_ACTION.RECOVER:
      await dispatch(context, token, {type: 'recovery_started'}, LOG_TYPE.recover_by_key);
      await recover(context, token);
      return;
    case RETRY_ACTION.CHECK_UPLOAD:
      await checkUploadAfterRestart(context, token);
  }
};

/** Pull to refresh, opening the result and returning to the app read the status once more. */
export const refreshStatus = async (context: ControllerContext) => {
  const operation = readStore(context).operation;
  if (!operation?.jobId || !hasServerJob(operation)) {
    return;
  }
  if (operation.phase === 'server_unavailable') {
    await retry(context);
    return;
  }
  await readJobAndContinue(context, tokenFor(context, operation.operationId));
};
