import {DELETION_STATUSES, IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob} from '@/src/types/importApi';
import {ImportFailure, ImportOperation, ImportPhase} from '@/src/types/importOperation';
import {
  canDeleteOnServer,
  DELETION_PHASES,
  hasServerJob,
  isAwaitingUploadOutcome,
  isUploadInFlight
} from '@/src/utils/import/importPhases';
import {JOB_ANSWER_VERDICT, judgeJobAnswer} from '@/src/utils/import/revisionGuard';

export type ImportEvent =
  /** 202 to a POST, or the job found by its idempotency key. */
  | {type: 'upload_accepted'; job: ImportJob}
  /** A 4xx to a POST: the same key and bytes would be refused the same way again. */
  | {type: 'upload_rejected'; httpStatus: number | null}
  /** No answer, a timeout, a 5xx or an unreadable body: the job may or may not exist. */
  | {type: 'upload_outcome_unknown'}
  /** A lookup by key starts: after a lost answer, after a restart or on "Retry". */
  | {type: 'recovery_started'}
  /** Every lookup failed to reach the server. */
  | {type: 'recovery_exhausted'}
  /** After a restart the server does not know the key: the file never arrived. */
  | {type: 'not_received'}
  /** "Send again": the same key and the same bytes go out once more. */
  | {type: 'resend_requested'}
  /** The private copy is gone while the outcome is still unknown. */
  | {type: 'file_missing'}
  | {type: 'job_answer'; job: ImportJob; hasItems: boolean}
  /** A 4xx other than 404 to a status read: the poll stops. */
  | {type: 'job_rejected'; httpStatus: number | null}
  /** The server stayed silent about a known job for too long. */
  | {type: 'connection_lost'}
  | {type: 'delete_requested'; deleteKey: string}
  | {type: 'delete_failed'}
  /** 404 for the job: the server no longer knows this statement. */
  | {type: 'gone_on_server'};

export type ImportTransition = {
  operation: ImportOperation;
  /** False when the event does not fit the current phase; the operation is then unchanged. */
  accepted: boolean;
  /** How a job answer was judged against the held revision; null for other events. */
  verdict: JOB_ANSWER_VERDICT | null;
};

const STATUS_PHASE: Record<IMPORT_STATUS, ImportPhase> = {
  [IMPORT_STATUS.QUEUED]: 'queued',
  [IMPORT_STATUS.PROCESSING]: 'processing',
  [IMPORT_STATUS.READY]: 'ready',
  [IMPORT_STATUS.DELETING]: 'deleting',
  [IMPORT_STATUS.DELETED]: 'deleted'
};

const phaseForStatus = (status: IMPORT_STATUS): ImportPhase => {
  return STATUS_PHASE[status];
};

/**
 * Once a deletion was asked for (the delete key is stored), an answer moves the operation only to
 * `deleting` or `deleted`: a job the server still keeps means the deletion did not go through,
 * even after a restart or a silent server, and the report never comes back.
 */
const phaseAfterAnswer = (operation: ImportOperation, status: IMPORT_STATUS): ImportPhase => {
  if (operation.deleteKey === null || DELETION_STATUSES.includes(status)) {
    return phaseForStatus(status);
  }
  if (DELETION_PHASES.includes(operation.phase)) {
    return operation.phase;
  }
  return 'delete_failed';
};

const accept = (
  operation: ImportOperation,
  verdict: JOB_ANSWER_VERDICT | null = null
): ImportTransition => {
  return {operation, accepted: true, verdict};
};

const ignore = (operation: ImportOperation): ImportTransition => {
  return {operation, accepted: false, verdict: null};
};

/** The event moves the operation only when it fits the phase; otherwise nothing changes. */
const moveWhen = (
  operation: ImportOperation,
  isAllowed: boolean,
  change: Partial<Pick<ImportOperation, 'phase' | 'failure' | 'deleteKey'>>
): ImportTransition => {
  if (!isAllowed) {
    return ignore(operation);
  }
  return accept({...operation, ...change});
};

const serverRejection = (httpStatus: number | null): ImportFailure => {
  return {reason: 'server_rejected', httpStatus};
};

const applyJobAnswer = (
  operation: ImportOperation,
  job: ImportJob,
  hasItems: boolean
): ImportTransition => {
  if (!hasServerJob(operation) || operation.jobId !== job.jobId) {
    return ignore(operation);
  }
  const verdict = judgeJobAnswer({revision: operation.revision, hasItems}, job);
  if (verdict === JOB_ANSWER_VERDICT.APPLY) {
    return accept(
      {
        ...operation,
        revision: job.revision,
        serverStatus: job.status,
        phase: phaseAfterAnswer(operation, job.status)
      },
      verdict
    );
  }
  // Any answer proves the server is back: a silent job returns to the status it last had.
  if (operation.phase === 'server_unavailable' && operation.serverStatus !== null) {
    return accept(
      {...operation, phase: phaseAfterAnswer(operation, operation.serverStatus)},
      verdict
    );
  }
  return accept(operation, verdict);
};

const applyJobRejection = (
  operation: ImportOperation,
  httpStatus: number | null
): ImportTransition => {
  if (operation.phase === 'deleting') {
    return accept({...operation, phase: 'delete_failed'});
  }
  const isRunning = operation.phase === 'queued' || operation.phase === 'processing';
  return moveWhen(operation, isRunning, {phase: 'failed', failure: serverRejection(httpStatus)});
};

const applyUploadAccepted = (operation: ImportOperation, job: ImportJob): ImportTransition => {
  if (!isAwaitingUploadOutcome(operation)) {
    return ignore(operation);
  }
  return accept({
    ...operation,
    jobId: job.jobId,
    revision: job.revision,
    serverStatus: job.status,
    phase: phaseForStatus(job.status),
    failure: null
  });
};

/** The events of an upload whose job is not known yet. */
type UploadEvent = Extract<
  ImportEvent,
  {
    type:
      | 'upload_rejected'
      | 'upload_outcome_unknown'
      | 'recovery_started'
      | 'recovery_exhausted'
      | 'not_received'
      | 'resend_requested'
      | 'file_missing';
  }
>;

const applyUploadEvent = (operation: ImportOperation, event: UploadEvent): ImportTransition => {
  const isAwaiting = isAwaitingUploadOutcome(operation);
  switch (event.type) {
    case 'upload_rejected':
      return moveWhen(operation, isUploadInFlight(operation), {
        phase: 'failed',
        failure: serverRejection(event.httpStatus)
      });
    case 'upload_outcome_unknown':
      return moveWhen(operation, isUploadInFlight(operation), {phase: 'reconnecting'});
    case 'recovery_started':
      return moveWhen(operation, isAwaiting && operation.phase !== 'not_received', {
        phase: 'reconnecting'
      });
    case 'recovery_exhausted':
      return moveWhen(operation, isAwaiting, {phase: 'server_unavailable'});
    case 'not_received':
      return moveWhen(operation, isAwaiting, {phase: 'not_received'});
    case 'resend_requested':
      return moveWhen(operation, operation.jobId === null && operation.phase === 'not_received', {
        phase: 'uploading'
      });
    case 'file_missing':
      return moveWhen(operation, isAwaiting, {phase: 'failed', failure: {reason: 'file_missing'}});
  }
};

/**
 * Pure phase transitions of the import operation, without React and without network. An event
 * that does not fit the current phase is ignored, so a late answer never moves an operation
 * that went on without it. Every event has its case: a new event does not compile until it does.
 */
export const importReducer = (operation: ImportOperation, event: ImportEvent): ImportTransition => {
  switch (event.type) {
    case 'upload_accepted':
      return applyUploadAccepted(operation, event.job);
    case 'job_answer':
      return applyJobAnswer(operation, event.job, event.hasItems);
    case 'job_rejected':
      return applyJobRejection(operation, event.httpStatus);
    case 'connection_lost':
      return moveWhen(operation, hasServerJob(operation), {phase: 'server_unavailable'});
    case 'delete_requested':
      return moveWhen(operation, canDeleteOnServer(operation), {
        deleteKey: operation.deleteKey ?? event.deleteKey,
        phase: 'deleting'
      });
    case 'delete_failed':
      return moveWhen(operation, operation.phase === 'deleting', {phase: 'delete_failed'});
    case 'gone_on_server':
      return moveWhen(operation, operation.jobId !== null, {phase: 'gone_on_server'});
    default:
      return applyUploadEvent(operation, event);
  }
};
