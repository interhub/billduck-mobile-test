import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob} from '@/src/types/importApi';
import {ImportOperation, ImportPhase} from '@/src/types/importOperation';
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

const UPLOAD_OUTCOME_PHASES: readonly ImportPhase[] = [
  'uploading',
  'reconnecting',
  'server_unavailable',
  'not_received'
];

const UPLOAD_IN_FLIGHT_PHASES: readonly ImportPhase[] = ['uploading', 'reconnecting'];

const SERVER_JOB_PHASES: readonly ImportPhase[] = [
  'queued',
  'processing',
  'ready',
  'deleting',
  'delete_failed',
  'server_unavailable'
];

const DELETION_PHASES: readonly ImportPhase[] = ['deleting', 'delete_failed'];

const DELETION_STATUSES: readonly IMPORT_STATUS[] = [IMPORT_STATUS.DELETING, IMPORT_STATUS.DELETED];

/** No job is known yet: the upload is in flight, being recovered or waiting for the person. */
export const isAwaitingUploadOutcome = (operation: ImportOperation): boolean => {
  return operation.jobId === null && UPLOAD_OUTCOME_PHASES.includes(operation.phase);
};

/** The server holds a job for this operation, and the operation is not finished. */
export const hasServerJob = (operation: ImportOperation): boolean => {
  return operation.jobId !== null && SERVER_JOB_PHASES.includes(operation.phase);
};

/**
 * The server keeps a job worth deleting: a running or finished import, or one whose status read
 * was refused after the job had been created.
 */
export const canDeleteOnServer = (operation: ImportOperation): boolean => {
  return hasServerJob(operation) || (operation.phase === 'failed' && operation.jobId !== null);
};

export const phaseForStatus = (status: IMPORT_STATUS): ImportPhase => {
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
  if (operation.phase === 'queued' || operation.phase === 'processing') {
    return accept({
      ...operation,
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus}
    });
  }
  return ignore(operation);
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

const isUploadInFlight = (operation: ImportOperation): boolean => {
  return operation.jobId === null && UPLOAD_IN_FLIGHT_PHASES.includes(operation.phase);
};

/**
 * Pure phase transitions of the import operation, without React and without network. An event
 * that does not fit the current phase is ignored, so a late answer never moves an operation
 * that went on without it.
 */
export const importReducer = (operation: ImportOperation, event: ImportEvent): ImportTransition => {
  switch (event.type) {
    case 'upload_accepted':
      return applyUploadAccepted(operation, event.job);
    case 'upload_rejected':
      if (!isUploadInFlight(operation)) {
        return ignore(operation);
      }
      return accept({
        ...operation,
        phase: 'failed',
        failure: {reason: 'server_rejected', httpStatus: event.httpStatus}
      });
    case 'upload_outcome_unknown':
      if (!isUploadInFlight(operation)) {
        return ignore(operation);
      }
      return accept({...operation, phase: 'reconnecting'});
    case 'recovery_started':
      if (!isAwaitingUploadOutcome(operation) || operation.phase === 'not_received') {
        return ignore(operation);
      }
      return accept({...operation, phase: 'reconnecting'});
    case 'recovery_exhausted':
      if (!isAwaitingUploadOutcome(operation)) {
        return ignore(operation);
      }
      return accept({...operation, phase: 'server_unavailable'});
    case 'not_received':
      if (!isAwaitingUploadOutcome(operation)) {
        return ignore(operation);
      }
      return accept({...operation, phase: 'not_received'});
    case 'resend_requested':
      if (operation.jobId !== null || operation.phase !== 'not_received') {
        return ignore(operation);
      }
      return accept({...operation, phase: 'uploading'});
    case 'file_missing':
      if (!isAwaitingUploadOutcome(operation)) {
        return ignore(operation);
      }
      return accept({...operation, phase: 'failed', failure: {reason: 'file_missing'}});
    case 'job_answer':
      return applyJobAnswer(operation, event.job, event.hasItems);
    case 'job_rejected':
      return applyJobRejection(operation, event.httpStatus);
    case 'connection_lost':
      if (!hasServerJob(operation)) {
        return ignore(operation);
      }
      return accept({...operation, phase: 'server_unavailable'});
    case 'delete_requested':
      if (!canDeleteOnServer(operation)) {
        return ignore(operation);
      }
      return accept({
        ...operation,
        deleteKey: operation.deleteKey ?? event.deleteKey,
        phase: 'deleting'
      });
    case 'delete_failed':
      if (operation.phase !== 'deleting') {
        return ignore(operation);
      }
      return accept({...operation, phase: 'delete_failed'});
    case 'gone_on_server':
      if (operation.jobId === null) {
        return ignore(operation);
      }
      return accept({...operation, phase: 'gone_on_server'});
    default:
      return ignore(operation);
  }
};
