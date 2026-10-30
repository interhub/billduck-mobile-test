import {LIMITS} from '@/src/constants/LIMITS';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {ApiError, ImportJob} from '@/src/types/importApi';
import {ImportOutcome, ImportOutcomeKind} from '@/src/types/importDraft';
import {ImportOperation, PendingCleanup} from '@/src/types/importOperation';
import {isReplacingPrevious} from '@/src/utils/import/importPhases';
import {ImportEvent, importReducer, ImportTransition} from '@/src/utils/import/importReducer';
import {
  appendTimelineEntry,
  TIMELINE_EVENT,
  TimelineEntryInput
} from '@/src/utils/import/importTimeline';
import {isTokenCurrent, RunToken} from '@/src/utils/import/runToken';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

export const readStore = (context: ControllerContext) => context.store.getState();

export const nowIso = (context: ControllerContext): string => context.now().toISOString();

export const tokenFor = (context: ControllerContext, operationId: string): RunToken => ({
  operationId,
  generation: context.runtime.generation()
});

export const isCurrent = (context: ControllerContext, token: RunToken): boolean => {
  const operationId = readStore(context).operation?.operationId ?? null;
  return isTokenCurrent(token, context.runtime.generation(), operationId);
};

/** The operation the token was started for, or null once the phone works on something else. */
export const currentOperation = (
  context: ControllerContext,
  token: RunToken
): ImportOperation | null => {
  const operation = readStore(context).operation;
  if (!operation || !isCurrent(context, token)) {
    return null;
  }
  return operation;
};

export const record = (context: ControllerContext, input: TimelineEntryInput) => {
  const at = nowIso(context);
  context.store.setState((current) => {
    const entryContext = {id: current.nextEntryId, at, limit: LIMITS.TIMELINE_MAX_ENTRIES};
    return {
      nextEntryId: current.nextEntryId + 1,
      timeline: appendTimelineEntry(current.timeline, input, entryContext),
      journal: appendTimelineEntry(current.journal, input, entryContext)
    };
  });
};

/** A row about the token's operation; while a new statement waits, it is about the previous one. */
export const recordFor = (
  context: ControllerContext,
  token: RunToken,
  input: Omit<TimelineEntryInput, 'operationId'>
) => {
  record(context, {
    ...input,
    operationId: token.operationId,
    aboutPrevious: isReplacingPrevious(readStore(context).draft)
  });
};

/** A request of the token's operation got no answer: a timeline row and an error log. */
export const recordNoAnswer = (
  context: ControllerContext,
  token: RunToken,
  logType: LOG_TYPE,
  error: ApiError,
  attempt: number | null = null
) => {
  recordFor(context, token, {
    event: TIMELINE_EVENT.NO_ANSWER,
    errorKind: error.kind,
    httpStatus: error.httpStatus,
    attempt
  });
  logger.e(LOG_NAME.error_log, {
    type: logType,
    job_id: readStore(context).operation?.jobId ?? null,
    error_kind: error.kind,
    http_status: error.httpStatus,
    attempt
  });
};

/** An answer for an operation the phone no longer works on: in the timeline, never applied. */
export const recordDroppedAnswer = (
  context: ControllerContext,
  token: RunToken,
  job: ImportJob | null = null
) => {
  record(context, {
    operationId: token.operationId,
    event: TIMELINE_EVENT.LATE_ANSWER_DROPPED,
    status: job?.status,
    revision: job?.revision
  });
};

/** The payments of a ready job: shown at once, never stored. */
export const keepPayments = (context: ControllerContext, job: ImportJob) => {
  if (job.items && job.currency) {
    context.store.setState({payments: {currency: job.currency, items: job.items}});
  }
};

/** A write that did not reach the disk: the step that needed it stops where it was. */
const reportWriteFailure = (
  context: ControllerContext,
  logType: LOG_TYPE,
  error: ApiError,
  jobId: string | null
) => {
  context.runtime.countWriteFailure();
  logger.e(LOG_NAME.error_log, {
    type: logType,
    job_id: jobId,
    error_kind: error.kind,
    http_status: error.httpStatus
  });
};

const withUpdatedAt = (
  context: ControllerContext,
  operation: ImportOperation | null
): ImportOperation | null => {
  if (!operation) {
    return null;
  }
  return {...operation, updatedAt: nowIso(context)};
};

/** Writes to disk first and mirrors into the store only after the write has finished. */
export const saveSnapshot = async (
  context: ControllerContext,
  operation: ImportOperation | null,
  pendingCleanups: PendingCleanup[],
  logType: LOG_TYPE
): Promise<boolean> => {
  const previousPhase = readStore(context).operation?.phase;
  const stored = withUpdatedAt(context, operation);
  const saved = await context.repository.save({operation: stored, pendingCleanups});
  if (!saved.success) {
    reportWriteFailure(context, logType, saved.error, stored?.jobId ?? null);
    return false;
  }
  context.store.setState({operation: stored, pendingCleanups});
  if (stored && stored.phase !== previousPhase) {
    logger.d(LOG_NAME.import_phase_changed, {
      job_id: stored.jobId,
      phase: stored.phase,
      revision: stored.revision
    });
  }
  return true;
};

/**
 * Runs an event of the token's operation through the phase reducer and stores the result. Null
 * when the operation is no longer current or the result could not be stored.
 */
export const dispatch = (
  context: ControllerContext,
  token: RunToken,
  event: ImportEvent,
  logType: LOG_TYPE
): Promise<ImportTransition | null> =>
  context.serialize(async () => {
    const current = currentOperation(context, token);
    if (!current) {
      return null;
    }
    const transition = importReducer(current, event);
    if (!transition.accepted || transition.operation === current) {
      return transition;
    }
    const pendingCleanups = readStore(context).pendingCleanups;
    const isSaved = await saveSnapshot(context, transition.operation, pendingCleanups, logType);
    if (!isSaved) {
      return null;
    }
    return transition;
  });

/** Stores a changed cleanup list next to the operation; false when the write failed. */
export const updateCleanups = (
  context: ControllerContext,
  change: (cleanups: PendingCleanup[]) => PendingCleanup[],
  logType: LOG_TYPE
): Promise<boolean> =>
  context.serialize(() => {
    const {operation, pendingCleanups} = readStore(context);
    return saveSnapshot(context, operation, change(pendingCleanups), logType);
  });

/** An upload whose outcome nobody knows: deleted on the server later, if it ever got there. */
export const addPendingCleanup = (
  context: ControllerContext,
  idempotencyKey: string,
  logType: LOG_TYPE
): Promise<boolean> =>
  updateCleanups(
    context,
    (cleanups) => [...cleanups, {idempotencyKey, jobId: null, deleteKey: null}],
    logType
  );

const buildOutcome = (
  context: ControllerContext,
  operation: ImportOperation,
  outcomeKind: ImportOutcomeKind | null
): ImportOutcome | null => {
  if (!outcomeKind) {
    return null;
  }
  return {kind: outcomeKind, operation, at: nowIso(context)};
};

/** Forgets the operation on disk and in memory; any answer that still comes for it is dropped. */
export const closeOperation = (
  context: ControllerContext,
  operation: ImportOperation,
  outcomeKind: ImportOutcomeKind | null,
  logType: LOG_TYPE
): Promise<void> =>
  context.serialize(async () => {
    if (readStore(context).operation?.operationId !== operation.operationId) {
      return;
    }
    context.runtime.startNextGeneration();
    const pendingCleanups = readStore(context).pendingCleanups;
    const saved = await context.repository.save({operation: null, pendingCleanups});
    if (!saved.success) {
      reportWriteFailure(context, logType, saved.error, operation.jobId);
      return;
    }
    context.files.removeCopy(operation.operationId);
    // One update: a screen never sees the operation gone before its outcome is there.
    context.store.setState({
      operation: null,
      pendingCleanups,
      payments: null,
      isPollingSilent: false,
      outcome: buildOutcome(context, operation, outcomeKind)
    });
  });

/** A pause that also waits for the foreground: no server read happens in the background. */
export const waitInForeground = async (context: ControllerContext, durationMs: number) => {
  await context.wait(durationMs);
  await context.activity.whenActive();
};
