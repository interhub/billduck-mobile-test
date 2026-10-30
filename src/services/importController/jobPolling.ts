import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {
  currentOperation,
  dispatch,
  isCurrent,
  readStore,
  recordFor,
  recordNoAnswer
} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {finishDeleted, handleJobAnswer, markGone} from '@/src/services/importController/jobAnswers';
import {ApiError, ImportJob} from '@/src/types/importApi';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {isPolling} from '@/src/utils/import/importPhases';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  addFailedRead,
  isSilenceTooLong,
  NO_SILENCE,
  PollSilence,
  startsReconnecting
} from '@/src/utils/import/pollSilence';
import {runIdOf, RunToken} from '@/src/utils/import/runToken';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {POLL_STEP, runPollLoop} from '@/src/utils/promise/runPollLoop';

/** What one status read of the loop led to, and how silent the server is after it. */
type PollRead = {
  step: POLL_STEP;
  silence: PollSilence;
};

/** An answer of the loop; a deleted job ends the import, a forgotten one is gone. */
const applyPollAnswer = async (
  context: ControllerContext,
  token: RunToken,
  job: ImportJob | null
): Promise<POLL_STEP> => {
  if (job === null) {
    await markGone(context, token, HTTP_STATUS.NOT_FOUND, LOG_TYPE.poll_job);
    return POLL_STEP.STOP;
  }
  await handleJobAnswer(context, token, job, LOG_TYPE.poll_job);
  const phaseAfterAnswer = readStore(context).operation?.phase;
  if (phaseAfterAnswer === 'deleted') {
    await finishDeleted(context, token);
    return POLL_STEP.STOP;
  }
  return POLL_STEP.ANSWERED;
};

/**
 * A failed read: a refusal stops the poll. Silence first shows "Reconnecting…", and after
 * SERVER_SILENCE_LIMIT_MS without any answer the job becomes `server_unavailable`.
 */
const countPollFailure = async (
  context: ControllerContext,
  token: RunToken,
  error: ApiError,
  silence: PollSilence
): Promise<PollRead> => {
  if (error.kind === ERROR_KIND.VALIDATION) {
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.poll_job,
      job_id: readStore(context).operation?.jobId ?? null,
      error_kind: error.kind,
      http_status: error.httpStatus
    });
    recordFor(context, token, {
      event: TIMELINE_EVENT.STATUS_REJECTED,
      httpStatus: error.httpStatus,
      errorKind: error.kind
    });
    await dispatch(
      context,
      token,
      {type: 'job_rejected', httpStatus: error.httpStatus},
      LOG_TYPE.poll_job
    );
    return {step: POLL_STEP.STOP, silence};
  }
  const nowMs = context.now().getTime();
  const longerSilence = addFailedRead(silence, nowMs);
  recordNoAnswer(context, token, LOG_TYPE.poll_job, error, longerSilence.failures);
  if (startsReconnecting(longerSilence)) {
    recordFor(context, token, {event: TIMELINE_EVENT.RECONNECTING});
    context.store.setState({isPollingSilent: true});
  }
  if (!isSilenceTooLong(longerSilence, nowMs)) {
    return {step: POLL_STEP.FAILED, silence: longerSilence};
  }
  recordFor(context, token, {event: TIMELINE_EVENT.SERVER_UNAVAILABLE});
  context.store.setState({isPollingSilent: false});
  await dispatch(context, token, {type: 'connection_lost'}, LOG_TYPE.poll_job);
  return {step: POLL_STEP.STOP, silence: longerSilence};
};

/** One status read of the polling loop. */
const readJobOnce = async (
  context: ControllerContext,
  token: RunToken,
  silence: PollSilence
): Promise<PollRead> => {
  const operation = currentOperation(context, token);
  if (!operation?.jobId) {
    return {step: POLL_STEP.STOP, silence};
  }
  const jobRead = await context.api.getImport(operation.jobId);
  if (!isCurrent(context, token)) {
    return {step: POLL_STEP.STOP, silence};
  }
  if (!jobRead.success) {
    return countPollFailure(context, token, jobRead.error, silence);
  }
  const step = await applyPollAnswer(context, token, jobRead.payload);
  return {step, silence: NO_SILENCE};
};

/**
 * Reads the job every POLL_INTERVAL_MS while it is queued, processing or deleting; failures
 * back off up to POLL_MAX_BACKOFF_MS. Stops in the background; `onForeground` starts it again.
 */
export const pollJob = async (context: ControllerContext, token: RunToken): Promise<void> => {
  const silence = {current: NO_SILENCE};
  await context.pollingFlight(runIdOf(token), () =>
    runPollLoop({
      intervalMs: LIMITS.POLL_INTERVAL_MS,
      maxBackoffMs: LIMITS.POLL_MAX_BACKOFF_MS,
      waitFor: context.wait,
      shouldContinue: () =>
        isCurrent(context, token) &&
        context.activity.isActive() &&
        isPolling(readStore(context).operation),
      readOnce: async () => {
        const read = await readJobOnce(context, token, silence.current);
        silence.current = read.silence;
        return read.step;
      }
    })
  );
};

/** Picks the next step from the phase the operation is in now. */
export const continueJob = async (context: ControllerContext, token: RunToken): Promise<void> => {
  const operation = currentOperation(context, token);
  if (!operation) {
    return;
  }
  if (operation.phase === 'deleted') {
    await finishDeleted(context, token);
    return;
  }
  if (isPolling(operation)) {
    await pollJob(context, token);
  }
};
