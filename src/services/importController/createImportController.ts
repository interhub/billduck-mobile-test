import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {DELETION_STATUSES, IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ImportControllerDeps} from '@/src/services/importController/importControllerTypes';
import {INITIAL_IMPORT_STATE} from '@/src/stores/importStore';
import {ApiError, ApiResult, ImportJob} from '@/src/types/importApi';
import {ImportDraft, ImportOutcome, ImportOutcomeKind} from '@/src/types/importDraft';
import {ImportOperation, PendingCleanup} from '@/src/types/importOperation';
import {PickedStatement} from '@/src/types/statementFiles';
import {ERROR_KIND, resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';
import {buildServerFileName} from '@/src/utils/files/buildServerFileName';
import {toKilobytes} from '@/src/utils/format/formatFileSize';
import {canAddStatement} from '@/src/utils/import/canAddStatement';
import {
  checkStatementFile,
  checkStatementSize,
  claimsToBePdf,
  STATEMENT_REJECTION
} from '@/src/utils/files/checkStatementFile';
import {
  canDeleteOnServer,
  hasServerJob,
  isAwaitingUploadOutcome,
  isPolling,
  isReplacingPrevious
} from '@/src/utils/import/importPhases';
import {ImportEvent, importReducer, ImportTransition} from '@/src/utils/import/importReducer';
import {
  appendTimelineEntry,
  TIMELINE_EVENT,
  TimelineEntryInput
} from '@/src/utils/import/importTimeline';
import {JOB_ANSWER_VERDICT} from '@/src/utils/import/revisionGuard';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {createSerialQueue} from '@/src/utils/promise/createSerialQueue';
import {runDelayLadder} from '@/src/utils/promise/runDelayLadder';
import {POLL_STEP, runPollLoop} from '@/src/utils/promise/runPollLoop';

/** Binds an async step to the operation it was started for. */
type RunToken = {
  operationId: string;
  generation: number;
};

type PostOutcome = 'settled' | 'unknown';

type DeletionResult = 'deleted' | 'gone' | 'failed' | 'stopped';

/** What the key says about the stored job: still ours, gone, no answer, or the run is over. */
type Ownership = 'confirmed' | 'gone' | 'no_answer' | 'dropped';

/** Polling state of one loop: failed reads in a row and the moment the silence began. */
type Silence = {
  failures: number;
  since: number | null;
};

/**
 * A refusal the server would repeat for the same key and bytes (a 4xx other than a timeout or a
 * rate limit, as the classifier tells), so the upload is not tried again.
 */
const isHardRejection = (error: ApiError): boolean => {
  return error.kind === ERROR_KIND.VALIDATION && error.httpStatus !== null;
};

/** The status a key lookup really got: 404, or 200 with a job that is not ours. */
const lookupStatus = (found: ImportJob | null): number => {
  if (found) {
    return HTTP_STATUS.OK;
  }
  return HTTP_STATUS.NOT_FOUND;
};

/** The previous statement deleted to make room for a new one is not announced as "Deleted". */
const resolveDeletionOutcome = (isReplacing: boolean): ImportOutcomeKind | null => {
  if (isReplacing) {
    return null;
  }
  return 'deleted';
};

const resolveUploadEvent = (attempt: number | null): TIMELINE_EVENT => {
  if (attempt === null) {
    return TIMELINE_EVENT.UPLOAD_SENT;
  }
  return TIMELINE_EVENT.RESENT_SAME_KEY;
};

/** The stored version of the entry with the same key; every other entry stays as it is. */
const replaceByKey = (entry: PendingCleanup, stored: PendingCleanup): PendingCleanup => {
  if (entry.idempotencyKey !== stored.idempotencyKey) {
    return entry;
  }
  return stored;
};

const listReferencedCopies = (operation: ImportOperation | null): string[] => {
  if (!operation) {
    return [];
  }
  return [operation.operationId];
};

/**
 * The long-lived owner of the import. Screens call its actions and read `importStore`; every
 * server answer goes through the phase reducer, and every change of the operation reaches the
 * disk before the store shows it. Nothing here navigates.
 */
export const createImportController = ({
  api,
  repository,
  files,
  store,
  activity,
  createUuid,
  now,
  wait
}: ImportControllerDeps) => {
  const serialize = createSerialQueue();
  const runtime = {
    /** Grows whenever the operation the phone works on is closed, so its late answers are dropped. */
    generation: 0,
    pollingKey: null as string | null,
    recoveringKey: null as string | null,
    deletingKey: null as string | null,
    isCleaningUp: false,
    isCleanupRequested: false,
    isPicking: false,
    isSending: false,
    uploadAbort: null as AbortController | null,
    /** Uploads whose first POST was made by this launch: only they are re-sent without asking. */
    sentThisLaunch: new Set<string>(),
    /** Stored jobs whose key was checked in this launch. */
    verifiedThisLaunch: new Set<string>()
  };

  const state = () => store.getState();
  const nowIso = () => now().toISOString();
  const tokenFor = (operationId: string): RunToken => ({
    operationId,
    generation: runtime.generation
  });
  const keyOf = (token: RunToken) => `${token.operationId}:${token.generation}`;
  const isCurrent = (token: RunToken): boolean =>
    token.generation === runtime.generation && state().operation?.operationId === token.operationId;

  const record = (input: TimelineEntryInput) => {
    const at = nowIso();
    store.setState((current) => {
      const context = {id: current.nextEntryId, at, limit: LIMITS.TIMELINE_MAX_ENTRIES};
      return {
        nextEntryId: current.nextEntryId + 1,
        timeline: appendTimelineEntry(current.timeline, input, context),
        journal: appendTimelineEntry(current.journal, input, context)
      };
    });
  };

  const recordFor = (token: RunToken, input: Omit<TimelineEntryInput, 'operationId'>) => {
    record({
      ...input,
      operationId: token.operationId,
      aboutPrevious: isReplacingPrevious(state().draft)
    });
  };

  const withUpdatedAt = (operation: ImportOperation | null): ImportOperation | null => {
    if (!operation) {
      return null;
    }
    return {...operation, updatedAt: nowIso()};
  };

  /** Writes to disk first and mirrors into the store only after the write has finished. */
  const saveSnapshot = async (
    operation: ImportOperation | null,
    pendingCleanups: PendingCleanup[]
  ) => {
    const previousPhase = state().operation?.phase;
    const stored = withUpdatedAt(operation);
    await repository.save({operation: stored, pendingCleanups});
    store.setState({operation: stored, pendingCleanups});
    if (stored && stored.phase !== previousPhase) {
      logger.d(LOG_NAME.import_phase_changed, {
        job_id: stored.jobId,
        phase: stored.phase,
        revision: stored.revision
      });
    }
  };

  const dispatch = (token: RunToken, event: ImportEvent): Promise<ImportTransition | null> =>
    serialize(async () => {
      const current = state().operation;
      if (!current || !isCurrent(token)) {
        return null;
      }
      const transition = importReducer(current, event);
      if (transition.accepted && transition.operation !== current) {
        await saveSnapshot(transition.operation, state().pendingCleanups);
      }
      return transition;
    });

  const updateCleanups = (
    change: (cleanups: PendingCleanup[]) => PendingCleanup[]
  ): Promise<void> =>
    serialize(async () => {
      await saveSnapshot(state().operation, change(state().pendingCleanups));
    });

  const buildOutcome = (
    operation: ImportOperation,
    outcomeKind: ImportOutcomeKind | null
  ): ImportOutcome | null => {
    if (!outcomeKind) {
      return null;
    }
    return {kind: outcomeKind, operation, at: nowIso()};
  };

  /** Forgets the operation on disk and in memory; any answer that still comes for it is dropped. */
  const closeOperation = (
    operation: ImportOperation,
    outcomeKind: ImportOutcomeKind | null
  ): Promise<void> =>
    serialize(async () => {
      if (state().operation?.operationId !== operation.operationId) {
        return;
      }
      runtime.generation += 1;
      const pendingCleanups = state().pendingCleanups;
      await repository.save({operation: null, pendingCleanups});
      files.removeCopy(operation.operationId);
      // One update: a screen never sees the operation gone before its outcome is there.
      store.setState({
        operation: null,
        pendingCleanups,
        payments: null,
        isPollingSilent: false,
        outcome: buildOutcome(operation, outcomeKind)
      });
    });

  const handleJobAnswer = async (token: RunToken, job: ImportJob): Promise<void> => {
    const transition = await dispatch(token, {
      type: 'job_answer',
      job,
      hasItems: state().payments !== null
    });
    const answer = {status: job.status, revision: job.revision};
    if (!transition?.accepted) {
      record({
        operationId: token.operationId,
        event: TIMELINE_EVENT.LATE_ANSWER_DROPPED,
        ...answer
      });
      return;
    }
    store.setState({lastAnswerAt: nowIso(), isPollingSilent: false});
    if (transition.verdict === JOB_ANSWER_VERDICT.STALE) {
      recordFor(token, {event: TIMELINE_EVENT.STATUS_STALE_SKIPPED, ...answer});
      store.setState({staleSkippedCount: state().staleSkippedCount + 1});
      logger.w(LOG_NAME.warning_log, {
        type: LOG_TYPE.poll_job,
        job_id: job.jobId,
        revision: job.revision
      });
      return;
    }
    if (transition.verdict === JOB_ANSWER_VERDICT.SAME) {
      recordFor(token, {event: TIMELINE_EVENT.STATUS_UNCHANGED, ...answer});
      return;
    }
    recordFor(token, {event: TIMELINE_EVENT.STATUS_APPLIED, ...answer});
    if (job.items && job.currency) {
      store.setState({payments: {currency: job.currency, items: job.items}});
    }
  };

  const finishDeleted = async (token: RunToken) => {
    const operation = state().operation;
    if (!operation || !isCurrent(token) || operation.phase !== 'deleted') {
      return;
    }
    recordFor(token, {
      event: TIMELINE_EVENT.DELETED,
      status: IMPORT_STATUS.DELETED,
      revision: operation.revision
    });
    logger.d(LOG_NAME.debug_log, {
      type: LOG_TYPE.delete_import,
      job_id: operation.jobId,
      phase: operation.phase
    });
    const isReplacing = isReplacingPrevious(state().draft);
    await closeOperation(operation, resolveDeletionOutcome(isReplacing));
  };

  const markGone = async (token: RunToken, httpStatus: number) => {
    const transition = await dispatch(token, {type: 'gone_on_server'});
    if (!transition?.accepted) {
      return;
    }
    recordFor(token, {event: TIMELINE_EVENT.GONE_ON_SERVER, httpStatus});
    logger.w(LOG_NAME.warning_log, {
      type: LOG_TYPE.poll_job,
      job_id: transition.operation.jobId,
      http_status: httpStatus
    });
    await closeOperation(transition.operation, 'gone_on_server');
  };

  /**
   * A reset mock numbers jobs from the start again, so a stored job id may already belong to
   * someone else's upload. Before a status read or a DELETE outside polling, the key must still
   * lead to our job; otherwise the import is gone and the other job is never read or deleted.
   */
  const confirmOwnership = async (token: RunToken): Promise<Ownership> => {
    const operation = state().operation;
    if (!operation?.jobId || !isCurrent(token)) {
      return 'dropped';
    }
    const found = await api.getImportByKey(operation.idempotencyKey);
    if (!isCurrent(token)) {
      return 'dropped';
    }
    if (!found.success) {
      recordFor(token, {
        event: TIMELINE_EVENT.NO_ANSWER,
        errorKind: found.error.kind,
        httpStatus: found.error.httpStatus
      });
      return 'no_answer';
    }
    if (found.payload?.jobId === operation.jobId) {
      return 'confirmed';
    }
    const httpStatus = lookupStatus(found.payload);
    recordFor(token, {event: TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND, httpStatus});
    await markGone(token, httpStatus);
    return 'gone';
  };

  /** One status read of the polling loop. */
  const readJobOnce = async (token: RunToken, silence: Silence): Promise<POLL_STEP> => {
    const operation = state().operation;
    if (!operation?.jobId) {
      return POLL_STEP.STOP;
    }
    const answer = await api.getImport(operation.jobId);
    if (!isCurrent(token)) {
      return POLL_STEP.STOP;
    }
    if (answer.success) {
      silence.failures = 0;
      silence.since = null;
      if (answer.payload === null) {
        await markGone(token, HTTP_STATUS.NOT_FOUND);
        return POLL_STEP.STOP;
      }
      await handleJobAnswer(token, answer.payload);
      if (state().operation?.phase === 'deleted') {
        await finishDeleted(token);
        return POLL_STEP.STOP;
      }
      return POLL_STEP.ANSWERED;
    }
    const {kind, httpStatus} = answer.error;
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.poll_job,
      job_id: operation.jobId,
      error_kind: kind,
      http_status: httpStatus
    });
    if (kind === ERROR_KIND.VALIDATION) {
      recordFor(token, {event: TIMELINE_EVENT.STATUS_REJECTED, httpStatus, errorKind: kind});
      await dispatch(token, {type: 'job_rejected', httpStatus});
      return POLL_STEP.STOP;
    }
    silence.failures += 1;
    silence.since = silence.since ?? now().getTime();
    recordFor(token, {
      event: TIMELINE_EVENT.NO_ANSWER,
      errorKind: kind,
      httpStatus,
      attempt: silence.failures
    });
    if (silence.failures === LIMITS.POLL_FAILURES_BEFORE_RECONNECTING) {
      recordFor(token, {event: TIMELINE_EVENT.RECONNECTING});
      store.setState({isPollingSilent: true});
    }
    if (now().getTime() - silence.since >= LIMITS.SERVER_SILENCE_LIMIT_MS) {
      recordFor(token, {event: TIMELINE_EVENT.SERVER_UNAVAILABLE});
      store.setState({isPollingSilent: false});
      await dispatch(token, {type: 'connection_lost'});
      return POLL_STEP.STOP;
    }
    return POLL_STEP.FAILED;
  };

  /**
   * Reads the job every half second while it is queued, processing or deleting; failures back
   * off up to 4 seconds. Stops in the background; `onForeground` starts it again.
   */
  const pollJob = async (token: RunToken): Promise<void> => {
    const key = keyOf(token);
    if (runtime.pollingKey === key) {
      return;
    }
    runtime.pollingKey = key;
    const silence: Silence = {failures: 0, since: null};
    try {
      await runPollLoop({
        intervalMs: LIMITS.POLL_INTERVAL_MS,
        maxBackoffMs: LIMITS.POLL_MAX_BACKOFF_MS,
        waitFor: wait,
        shouldContinue: () =>
          isCurrent(token) && activity.isActive() && isPolling(state().operation),
        readOnce: () => readJobOnce(token, silence)
      });
    } finally {
      if (runtime.pollingKey === key) {
        runtime.pollingKey = null;
      }
    }
  };

  /** Picks the next step from the phase the operation is in now. */
  const continueJob = async (token: RunToken): Promise<void> => {
    const operation = state().operation;
    if (!operation || !isCurrent(token)) {
      return;
    }
    if (operation.phase === 'deleted') {
      await finishDeleted(token);
      return;
    }
    if (isPolling(operation)) {
      await pollJob(token);
    }
  };

  /** The server confirmed a job for the upload: the private copy is no longer needed. */
  const acceptJob = async (token: RunToken, job: ImportJob) => {
    const transition = await dispatch(token, {type: 'upload_accepted', job});
    if (!transition?.accepted) {
      record({
        operationId: token.operationId,
        event: TIMELINE_EVENT.LATE_ANSWER_DROPPED,
        status: job.status,
        revision: job.revision
      });
      return;
    }
    files.removeCopy(token.operationId);
    runtime.verifiedThisLaunch.add(token.operationId);
    store.setState({lastAnswerAt: nowIso()});
    if (job.items && job.currency) {
      store.setState({payments: {currency: job.currency, items: job.items}});
    }
    await continueJob(token);
  };

  /** The private copy is gone while nobody knows whether the server got the file. */
  const markFileMissing = async (token: RunToken) => {
    const operation = state().operation;
    if (!operation || !isCurrent(token)) {
      return;
    }
    const cleanup = {idempotencyKey: operation.idempotencyKey, jobId: null, deleteKey: null};
    await updateCleanups((cleanups) => [...cleanups, cleanup]);
    recordFor(token, {event: TIMELINE_EVENT.FILE_MISSING});
    await dispatch(token, {type: 'file_missing'});
  };

  /** One POST of the stored operation with its stored key and the same bytes. */
  const postOnce = async (token: RunToken, attempt: number | null): Promise<PostOutcome> => {
    const operation = state().operation;
    if (!operation || !isCurrent(token)) {
      return 'settled';
    }
    if (!files.hasCopy(operation.operationId)) {
      await markFileMissing(token);
      return 'settled';
    }
    const uploadAbort = new AbortController();
    runtime.uploadAbort = uploadAbort;
    recordFor(token, {
      event: resolveUploadEvent(attempt),
      attempt
    });
    logger.d(LOG_NAME.debug_log, {
      type: LOG_TYPE.create_import,
      format: operation.file.format,
      size_kb: toKilobytes(operation.file.sizeBytes),
      attempt
    });
    const result = await api.createImport({
      fileUri: files.getCopyUri(operation.operationId),
      idempotencyKey: operation.idempotencyKey,
      serverFileName: operation.serverFileName,
      signal: uploadAbort.signal
    });
    if (!isCurrent(token)) {
      record({operationId: token.operationId, event: TIMELINE_EVENT.LATE_ANSWER_DROPPED});
      return 'settled';
    }
    if (result.success) {
      recordFor(token, {
        event: TIMELINE_EVENT.UPLOAD_ACCEPTED,
        status: result.payload.status,
        revision: result.payload.revision,
        httpStatus: HTTP_STATUS.ACCEPTED
      });
      await acceptJob(token, result.payload);
      return 'settled';
    }
    const {kind, httpStatus} = result.error;
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.create_import,
      error_kind: kind,
      http_status: httpStatus,
      attempt
    });
    if (isHardRejection(result.error)) {
      recordFor(token, {event: TIMELINE_EVENT.UPLOAD_REJECTED, httpStatus, errorKind: kind});
      await dispatch(token, {type: 'upload_rejected', httpStatus});
      files.removeCopy(token.operationId);
      return 'settled';
    }
    recordFor(token, {
      event: TIMELINE_EVENT.UPLOAD_ANSWER_LOST,
      errorKind: kind,
      httpStatus,
      attempt
    });
    await dispatch(token, {type: 'upload_outcome_unknown'});
    return 'unknown';
  };

  /** One recovery attempt: true when the outcome is settled, null to go on with the ladder. */
  const recoverOnce = async (
    token: RunToken,
    allowResend: boolean,
    attempt: number
  ): Promise<true | null> => {
    const operation = state().operation;
    if (!operation || !isCurrent(token)) {
      return true;
    }
    const found = await api.getImportByKey(operation.idempotencyKey);
    if (!isCurrent(token)) {
      return true;
    }
    if (!found.success) {
      const {kind, httpStatus} = found.error;
      recordFor(token, {event: TIMELINE_EVENT.NO_ANSWER, errorKind: kind, httpStatus, attempt});
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.recover_by_key,
        error_kind: kind,
        http_status: httpStatus,
        attempt
      });
      return null;
    }
    if (found.payload) {
      recordFor(token, {
        event: TIMELINE_EVENT.KEY_LOOKUP_FOUND,
        status: found.payload.status,
        revision: found.payload.revision,
        attempt
      });
      logger.d(LOG_NAME.debug_log, {
        type: LOG_TYPE.recover_by_key,
        job_id: found.payload.jobId,
        attempt
      });
      await acceptJob(token, found.payload);
      return true;
    }
    recordFor(token, {
      event: TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND,
      httpStatus: HTTP_STATUS.NOT_FOUND,
      attempt
    });
    if (!allowResend) {
      await dispatch(token, {type: 'not_received'});
      return true;
    }
    const outcome = await postOnce(token, attempt);
    if (outcome === 'unknown') {
      return null;
    }
    return true;
  };

  const waitInForeground = async (durationMs: number) => {
    await wait(durationMs);
    await activity.whenActive();
  };

  /**
   * After a lost answer: up to three lookups by key after 1, 2 and 4 seconds. A 404 re-sends the
   * same key and bytes, but only for an upload started in this launch; nothing here ever creates
   * a second job.
   */
  const recover = async (token: RunToken, allowResend: boolean): Promise<void> => {
    const key = keyOf(token);
    if (runtime.recoveringKey === key) {
      return;
    }
    runtime.recoveringKey = key;
    try {
      const settled = await runDelayLadder(
        LIMITS.RECOVERY_DELAYS_MS,
        (attempt) => recoverOnce(token, allowResend, attempt),
        waitInForeground
      );
      if (settled === null && isCurrent(token)) {
        recordFor(token, {event: TIMELINE_EVENT.SERVER_UNAVAILABLE});
        await dispatch(token, {type: 'recovery_exhausted'});
      }
    } finally {
      if (runtime.recoveringKey === key) {
        runtime.recoveringKey = null;
      }
    }
  };

  /** A DELETE that got no answer: the job state decides whether the deletion went through. */
  const settleUnansweredDelete = async (token: RunToken, jobId: string): Promise<boolean> => {
    const check = await api.getImport(jobId);
    if (!isCurrent(token)) {
      return true;
    }
    if (!check.success) {
      return false;
    }
    if (check.payload === null) {
      await markGone(token, HTTP_STATUS.NOT_FOUND);
      return true;
    }
    if (!DELETION_STATUSES.includes(check.payload.status)) {
      return false;
    }
    await handleJobAnswer(token, check.payload);
    await continueJob(token);
    return true;
  };

  /**
   * DELETE with the delete key stored before the request. Only a later GET with `deleted` ends
   * it; a 503 or any other refusal leaves the data on the server and says so.
   */
  const runDeletion = async (token: RunToken): Promise<void> => {
    const key = keyOf(token);
    if (runtime.deletingKey === key) {
      return;
    }
    runtime.deletingKey = key;
    try {
      const requested = await dispatch(token, {type: 'delete_requested', deleteKey: createUuid()});
      const operation = requested?.operation;
      if (!requested?.accepted || !operation?.jobId || !operation.deleteKey) {
        return;
      }
      const ownership = await confirmOwnership(token);
      if (ownership === 'no_answer') {
        recordFor(token, {event: TIMELINE_EVENT.DELETE_FAILED});
        await dispatch(token, {type: 'delete_failed'});
        return;
      }
      if (ownership !== 'confirmed') {
        return;
      }
      recordFor(token, {event: TIMELINE_EVENT.DELETE_SENT});
      const answer = await api.deleteImport(operation.jobId, operation.deleteKey);
      if (!isCurrent(token)) {
        return;
      }
      if (answer.success) {
        if (answer.payload === null) {
          await markGone(token, HTTP_STATUS.NOT_FOUND);
          return;
        }
        recordFor(token, {
          event: TIMELINE_EVENT.DELETE_ACCEPTED,
          status: answer.payload.status,
          revision: answer.payload.revision,
          httpStatus: HTTP_STATUS.ACCEPTED
        });
        // The answer to a DELETE only starts the deletion: "Deleted" waits for a GET that says so.
        if (answer.payload.status === IMPORT_STATUS.DELETING) {
          await handleJobAnswer(token, answer.payload);
        }
        await continueJob(token);
        return;
      }
      const {kind, httpStatus} = answer.error;
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.delete_import,
        job_id: operation.jobId,
        error_kind: kind,
        http_status: httpStatus
      });
      if (httpStatus === null && (await settleUnansweredDelete(token, operation.jobId))) {
        return;
      }
      recordFor(token, {event: TIMELINE_EVENT.DELETE_FAILED, httpStatus, errorKind: kind});
      await dispatch(token, {type: 'delete_failed'});
    } finally {
      if (runtime.deletingKey === key) {
        runtime.deletingKey = null;
      }
    }
  };

  /** Resolves once the deletion of the operation settles one way or the other. */
  const waitForDeletion = (operationId: string): Promise<DeletionResult> =>
    new Promise((resolve) => {
      const readResult = (): DeletionResult | null => {
        const {operation, outcome} = state();
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
      const immediate = readResult();
      if (immediate) {
        resolve(immediate);
        return;
      }
      const unsubscribe = store.subscribe(() => {
        const result = readResult();
        if (result) {
          unsubscribe();
          resolve(result);
        }
      });
    });

  /** Deletes the current statement on the server and waits for the confirmation. */
  const deleteImport = async (): Promise<DeletionResult> => {
    const operation = state().operation;
    if (!operation || !canDeleteOnServer(operation)) {
      return 'stopped';
    }
    await runDeletion(tokenFor(operation.operationId));
    return waitForDeletion(operation.operationId);
  };

  /** Stores the new operation with its key, then sends it: the key is on disk before the POST. */
  const sendNew = async (draft: ImportDraft, idempotencyKey: string, serverFileName: string) => {
    const operation: ImportOperation = {
      operationId: draft.operationId,
      idempotencyKey,
      deleteKey: null,
      phase: 'uploading',
      jobId: null,
      revision: 0,
      serverStatus: null,
      failure: null,
      file: {sizeBytes: draft.sizeBytes, format: draft.format ?? 'csv'},
      serverFileName,
      createdAt: draft.createdAt,
      updatedAt: draft.createdAt
    };
    await serialize(async () => {
      runtime.generation += 1;
      await saveSnapshot(operation, state().pendingCleanups);
      store.setState({
        draft: null,
        payments: null,
        outcome: null,
        isPollingSilent: false,
        lastAnswerAt: null
      });
    });
    runtime.sentThisLaunch.add(operation.operationId);
    const token = tokenFor(operation.operationId);
    if ((await postOnce(token, null)) === 'unknown') {
      await recover(token, true);
    }
  };

  const setDraft = (change: Partial<ImportDraft>) => {
    const draft = state().draft;
    if (draft) {
      store.setState({draft: {...draft, ...change}});
    }
  };

  /** The previous statement leaves the server before the new one is sent, or the new one waits. */
  const replaceAndSend = async (
    draft: ImportDraft,
    idempotencyKey: string,
    serverFileName: string
  ) => {
    const previous = state().operation;
    if (previous && canDeleteOnServer(previous)) {
      setDraft({phase: 'replacing_previous', isReplacementBlocked: false});
      const result = await deleteImport();
      if (result !== 'deleted' && result !== 'gone') {
        setDraft({isReplacementBlocked: true});
        return;
      }
    } else if (previous) {
      await closeOperation(previous, null);
    }
    await sendNew(draft, idempotencyKey, serverFileName);
  };

  const isAddingAllowed = (): boolean => canAddStatement(state().operation, state().draft);

  const rejectDraft = (operationId: string, reason: STATEMENT_REJECTION, sizeBytes: number) => {
    files.removeCopy(operationId);
    setDraft({phase: 'rejected', rejection: reason, sizeBytes});
    logger.w(LOG_NAME.warning_log, {type: LOG_TYPE.pick_file, size_kb: toKilobytes(sizeBytes)});
  };

  /** Size first, then only the first bytes; the name and type choose a message, never the verdict. */
  const checkDraft = (operationId: string, picked: PickedStatement) => {
    const reportedSize = picked.reportedSizeBytes ?? 0;
    if (checkStatementSize(reportedSize) === STATEMENT_REJECTION.TOO_LARGE) {
      rejectDraft(operationId, STATEMENT_REJECTION.TOO_LARGE, reportedSize);
      return;
    }
    const sizeBytes = files.readCopySize(operationId);
    if (sizeBytes === null) {
      rejectDraft(operationId, STATEMENT_REJECTION.UNREADABLE, reportedSize);
      return;
    }
    const sizeRejection = checkStatementSize(sizeBytes);
    if (sizeRejection) {
      rejectDraft(operationId, sizeRejection, sizeBytes);
      return;
    }
    const header = files.readCopyHeader(operationId, LIMITS.FORMAT_HEADER_BYTES);
    const result = checkStatementFile({
      sizeBytes,
      header,
      claimsPdf: claimsToBePdf(picked.originalName, picked.mimeType)
    });
    if (!result.success) {
      rejectDraft(operationId, result.reason, sizeBytes);
      return;
    }
    const createdAt = state().draft?.createdAt ?? nowIso();
    setDraft({
      phase: 'confirming',
      sizeBytes,
      format: result.format,
      idempotencyKey: createUuid(),
      serverFileName: buildServerFileName(new Date(createdAt), result.format)
    });
    logger.d(LOG_NAME.debug_log, {
      type: LOG_TYPE.pick_file,
      format: result.format,
      size_kb: toKilobytes(sizeBytes)
    });
  };

  /**
   * Opens the system picker and checks the chosen file before any network. Resolves true when a
   * file was chosen (the draft then shows the verdict), false when the person cancelled.
   */
  const pickFile = async (): Promise<boolean> => {
    if (runtime.isPicking || !isAddingAllowed() || state().draft) {
      return false;
    }
    runtime.isPicking = true;
    try {
      const operationId = createUuid();
      const picked = await files.pickStatement(operationId);
      const baseDraft: ImportDraft = {
        operationId,
        phase: 'validating',
        originalName: '',
        sizeBytes: 0,
        format: null,
        rejection: null,
        idempotencyKey: null,
        serverFileName: null,
        createdAt: nowIso(),
        isReplacementBlocked: false
      };
      if (!picked.success) {
        store.setState({draft: baseDraft});
        rejectDraft(operationId, STATEMENT_REJECTION.UNREADABLE, 0);
        return true;
      }
      const pickedFile = picked.payload;
      if (pickedFile === null) {
        files.removeCopy(operationId);
        return false;
      }
      store.setState({draft: {...baseDraft, originalName: pickedFile.originalName}});
      checkDraft(operationId, pickedFile);
      return true;
    } finally {
      runtime.isPicking = false;
    }
  };

  /** "Send": one key, one request, however many times the button is pressed. */
  const send = async (): Promise<void> => {
    const draft = state().draft;
    if (
      runtime.isSending ||
      draft?.phase !== 'confirming' ||
      !draft.idempotencyKey ||
      !draft.serverFileName
    ) {
      return;
    }
    if (!isAddingAllowed()) {
      return;
    }
    runtime.isSending = true;
    try {
      store.setState({timeline: [], outcome: null});
      await replaceAndSend(draft, draft.idempotencyKey, draft.serverFileName);
    } finally {
      runtime.isSending = false;
    }
  };

  /** "Cancel" on the confirm screen, "Choose another file", or a blocked replacement given up. */
  const cancelDraft = () => {
    const draft = state().draft;
    if (!draft || runtime.isSending) {
      return;
    }
    files.removeCopy(draft.operationId);
    store.setState({draft: null});
  };

  /** "Send again" after a restart found nothing on the server: the same key and the same bytes. */
  const sendAgain = async () => {
    const operation = state().operation;
    if (!operation || operation.phase !== 'not_received') {
      return;
    }
    const token = tokenFor(operation.operationId);
    const transition = await dispatch(token, {type: 'resend_requested'});
    if (!transition?.accepted) {
      return;
    }
    runtime.sentThisLaunch.add(operation.operationId);
    if ((await postOnce(token, null)) === 'unknown') {
      await recover(token, true);
    }
  };

  /** A stored job is trusted after a restart only if its key still leads to it: a reset mock reuses ids. */
  const verifyJob = async (token: RunToken) => {
    const operation = state().operation;
    if (!operation?.jobId || !isCurrent(token)) {
      return;
    }
    const found = await api.getImportByKey(operation.idempotencyKey);
    if (!isCurrent(token)) {
      return;
    }
    if (!found.success) {
      recordFor(token, {
        event: TIMELINE_EVENT.NO_ANSWER,
        errorKind: found.error.kind,
        httpStatus: found.error.httpStatus
      });
      await dispatch(token, {type: 'connection_lost'});
      return;
    }
    if (!found.payload || found.payload.jobId !== operation.jobId) {
      const httpStatus = lookupStatus(found.payload);
      recordFor(token, {event: TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND, httpStatus});
      await markGone(token, httpStatus);
      return;
    }
    runtime.verifiedThisLaunch.add(operation.operationId);
    recordFor(token, {
      event: TIMELINE_EVENT.KEY_LOOKUP_FOUND,
      status: found.payload.status,
      revision: found.payload.revision
    });
    await handleJobAnswer(token, found.payload);
    const isUnsentDeletion =
      state().operation?.phase === 'deleting' && !DELETION_STATUSES.includes(found.payload.status);
    if (isUnsentDeletion) {
      recordFor(token, {event: TIMELINE_EVENT.DELETE_FAILED});
      await dispatch(token, {type: 'delete_failed'});
      return;
    }
    await continueJob(token);
  };

  /** An upload with an unknown outcome after a restart: a lookup by key only, never a POST. */
  const checkUploadAfterRestart = async (token: RunToken) => {
    const operation = state().operation;
    if (!operation || !isCurrent(token)) {
      return;
    }
    await dispatch(token, {type: 'recovery_started'});
    const found = await api.getImportByKey(operation.idempotencyKey);
    if (!isCurrent(token)) {
      return;
    }
    if (!found.success) {
      recordFor(token, {
        event: TIMELINE_EVENT.NO_ANSWER,
        errorKind: found.error.kind,
        httpStatus: found.error.httpStatus
      });
      await dispatch(token, {type: 'recovery_exhausted'});
      return;
    }
    if (found.payload) {
      recordFor(token, {
        event: TIMELINE_EVENT.KEY_LOOKUP_FOUND,
        status: found.payload.status,
        revision: found.payload.revision
      });
      await acceptJob(token, found.payload);
      return;
    }
    recordFor(token, {
      event: TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND,
      httpStatus: HTTP_STATUS.NOT_FOUND
    });
    await dispatch(token, {type: 'not_received'});
  };

  /** One status read outside polling: pull to refresh, opening the result, Retry. */
  const readJobAndContinue = async (token: RunToken) => {
    const operation = state().operation;
    if (!operation?.jobId || !isCurrent(token)) {
      return;
    }
    if ((await confirmOwnership(token)) !== 'confirmed') {
      return;
    }
    const answer = await api.getImport(operation.jobId);
    if (!isCurrent(token)) {
      return;
    }
    if (!answer.success) {
      recordFor(token, {
        event: TIMELINE_EVENT.NO_ANSWER,
        errorKind: answer.error.kind,
        httpStatus: answer.error.httpStatus
      });
      return;
    }
    if (answer.payload === null) {
      await markGone(token, HTTP_STATUS.NOT_FOUND);
      return;
    }
    await handleJobAnswer(token, answer.payload);
    await continueJob(token);
  };

  /** "Retry": the blocked replacement, a failed deletion, or a silent server. */
  const retry = async () => {
    const {draft, operation} = state();
    if (draft?.isReplacementBlocked && draft.idempotencyKey && draft.serverFileName) {
      await replaceAndSend(draft, draft.idempotencyKey, draft.serverFileName);
      return;
    }
    if (!operation) {
      return;
    }
    const token = tokenFor(operation.operationId);
    if (operation.phase === 'delete_failed') {
      await runDeletion(token);
      return;
    }
    if (operation.phase !== 'server_unavailable') {
      return;
    }
    if (operation.jobId && runtime.verifiedThisLaunch.has(operation.operationId)) {
      await readJobAndContinue(token);
      return;
    }
    if (operation.jobId) {
      await verifyJob(token);
      return;
    }
    if (runtime.sentThisLaunch.has(operation.operationId)) {
      await dispatch(token, {type: 'recovery_started'});
      await recover(token, true);
      return;
    }
    await checkUploadAfterRestart(token);
  };

  /**
   * "Cancel upload": the private copy goes at once, the key moves to the cleanup list, and the
   * upload is deleted from the server as soon as it answers, if the file ever got there.
   */
  const cancelUpload = async () => {
    const operation = state().operation;
    if (!operation || !isAwaitingUploadOutcome(operation)) {
      return;
    }
    runtime.uploadAbort?.abort();
    const cleanup = {idempotencyKey: operation.idempotencyKey, jobId: null, deleteKey: null};
    await updateCleanups((cleanups) => [...cleanups, cleanup]);
    record({operationId: operation.operationId, event: TIMELINE_EVENT.UPLOAD_CANCELLED});
    await closeOperation(operation, 'upload_cancelled');
    void runCleanups();
  };

  /** Pull to refresh, opening the result and returning to the app read the status once more. */
  const refreshStatus = async () => {
    const operation = state().operation;
    if (!operation?.jobId || !hasServerJob(operation)) {
      return;
    }
    if (operation.phase === 'server_unavailable') {
      await retry();
      return;
    }
    await readJobAndContinue(tokenFor(operation.operationId));
  };

  /** Polls a cancelled upload's job until the server confirms the deletion. */
  const waitForCleanupDeleted = async (jobId: string): Promise<boolean> => {
    const confirmed = await runDelayLadder(
      Array.from({length: LIMITS.CLEANUP_POLL_ATTEMPTS}, () => LIMITS.POLL_INTERVAL_MS),
      async () => {
        const status = await api.getImport(jobId);
        if (!status.success) {
          return false;
        }
        if (status.payload === null || status.payload.status === IMPORT_STATUS.DELETED) {
          return true;
        }
        return null;
      },
      wait
    );
    return confirmed === true;
  };

  /**
   * Reads a cancelled upload by its key. Its POST may still be on its way, so a miss gets one
   * more look before the key is forgotten.
   */
  const findCancelledUpload = async (
    idempotencyKey: string
  ): Promise<ApiResult<ImportJob | null> | null> => {
    const first = await api.getImportByKey(idempotencyKey);
    if (!first.success || first.payload !== null) {
      return first;
    }
    return runDelayLadder(
      [LIMITS.CLEANUP_RECHECK_DELAY_MS],
      () => api.getImportByKey(idempotencyKey),
      wait
    );
  };

  /** One cleanup entry: true once the server holds nothing of that upload. */
  const cleanUp = async (cleanup: PendingCleanup): Promise<boolean> => {
    const found = await findCancelledUpload(cleanup.idempotencyKey);
    if (!found?.success) {
      return false;
    }
    if (found.payload === null) {
      record({
        operationId: null,
        event: TIMELINE_EVENT.CLEANUP_NOT_FOUND,
        httpStatus: HTTP_STATUS.NOT_FOUND
      });
      return true;
    }
    const job = found.payload;
    if (job.status === IMPORT_STATUS.DELETED) {
      return true;
    }
    const deleteKey = cleanup.deleteKey ?? createUuid();
    if (!cleanup.deleteKey) {
      const stored = {...cleanup, jobId: job.jobId, deleteKey};
      await updateCleanups((cleanups) => cleanups.map((entry) => replaceByKey(entry, stored)));
    }
    if (job.status !== IMPORT_STATUS.DELETING) {
      const deleted = await api.deleteImport(job.jobId, deleteKey);
      if (!deleted.success) {
        const {kind, httpStatus} = deleted.error;
        logger.e(LOG_NAME.error_log, {
          type: LOG_TYPE.cleanup_upload,
          job_id: job.jobId,
          error_kind: kind,
          http_status: httpStatus
        });
        return false;
      }
    }
    const isDeleted = await waitForCleanupDeleted(job.jobId);
    if (isDeleted) {
      record({
        operationId: null,
        event: TIMELINE_EVENT.CLEANUP_DELETED,
        status: IMPORT_STATUS.DELETED
      });
      logger.d(LOG_NAME.debug_log, {type: LOG_TYPE.cleanup_upload, job_id: job.jobId});
    }
    return isDeleted;
  };

  /** Deletes on the server every upload that was cancelled before its outcome was known. */
  const cleanUpAll = async () => {
    for (const cleanup of [...state().pendingCleanups]) {
      if (await cleanUp(cleanup)) {
        await updateCleanups((cleanups) =>
          cleanups.filter((entry) => entry.idempotencyKey !== cleanup.idempotencyKey)
        );
      }
    }
  };

  /** A request that comes while a pass runs is not lost: the running pass goes over the list again. */
  const runCleanups = async () => {
    if (runtime.isCleaningUp) {
      runtime.isCleanupRequested = true;
      return;
    }
    runtime.isCleaningUp = true;
    try {
      do {
        runtime.isCleanupRequested = false;
        await cleanUpAll();
      } while (runtime.isCleanupRequested);
    } finally {
      runtime.isCleaningUp = false;
    }
  };

  /** Reads the stored operation at launch and removes every file copy it does not reference. */
  const restore = async () => {
    try {
      const snapshot = await repository.load();
      const keep = listReferencedCopies(snapshot.operation);
      files.removeAllExcept(keep);
      store.setState({
        operation: snapshot.operation,
        pendingCleanups: snapshot.pendingCleanups,
        isRestored: true
      });
    } catch (error) {
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.restore_operation,
        error_kind: resolveErrorKind(error)
      });
      store.setState({isRestored: true});
    }
  };

  /** Continues a stored operation after a launch: lookups and polls only, never a POST. */
  const resume = async () => {
    void runCleanups();
    const operation = state().operation;
    if (!operation) {
      return;
    }
    const token = tokenFor(operation.operationId);
    if (operation.phase === 'deleted' || operation.phase === 'gone_on_server') {
      await closeOperation(operation, operation.phase);
      return;
    }
    if (operation.phase === 'failed' || operation.phase === 'not_received') {
      return;
    }
    recordFor(token, {event: TIMELINE_EVENT.APP_RESTARTED});
    if (isAwaitingUploadOutcome(operation)) {
      await checkUploadAfterRestart(token);
      return;
    }
    if (hasServerJob(operation)) {
      await verifyJob(token);
    }
  };

  /** Back in the foreground: polling resumes, a ready job is read again, cleanups get a chance. */
  const onForeground = () => {
    void runCleanups();
    const operation = state().operation;
    if (!operation) {
      return;
    }
    // A restored job is read only after `resume` checked in this launch that its key leads to it.
    if (operation.jobId && !runtime.verifiedThisLaunch.has(operation.operationId)) {
      return;
    }
    if (isPolling(operation)) {
      void pollJob(tokenFor(operation.operationId));
      return;
    }
    if (operation.phase === 'ready') {
      void refreshStatus();
    }
  };

  /** "Reset all": forgets the stored operation, the cleanup list, the copies and the journal. */
  const forgetEverything = () =>
    serialize(async () => {
      runtime.generation += 1;
      runtime.uploadAbort?.abort();
      await repository.save({operation: null, pendingCleanups: []});
      files.removeAllExcept([]);
      store.setState({...INITIAL_IMPORT_STATE, isRestored: true});
    });

  return {
    restore,
    resume,
    pickFile,
    send,
    cancelDraft,
    sendAgain,
    retry,
    cancelUpload,
    deleteImport,
    refreshStatus,
    onForeground,
    runCleanups,
    forgetEverything
  };
};

export type ImportController = ReturnType<typeof createImportController>;
