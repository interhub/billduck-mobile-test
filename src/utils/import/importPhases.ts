import {ConfirmedDraft, ImportDraft} from '@/src/types/importDraft';
import {ImportOperation, ImportPhase} from '@/src/types/importOperation';

export type BadgePhase = Exclude<ImportPhase, 'validating' | 'rejected' | 'confirming'>;

const PRE_SEND_PHASES: readonly ImportPhase[] = ['validating', 'rejected', 'confirming'];

export const POLLING_PHASES: readonly ImportPhase[] = ['queued', 'processing', 'deleting'];

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

export const DELETION_PHASES: readonly ImportPhase[] = ['deleting', 'delete_failed'];

/** Every phase from `uploading` on: the pre-send phases live in the draft and are never stored. */
export const STORED_PHASES: readonly ImportPhase[] = [
  'uploading',
  'reconnecting',
  'server_unavailable',
  'not_received',
  'queued',
  'processing',
  'ready',
  'failed',
  'deleting',
  'delete_failed',
  'deleted',
  'gone_on_server'
];

/** No job is known yet: the upload is in flight, being recovered or waiting for the person. */
export const isAwaitingUploadOutcome = (operation: ImportOperation): boolean => {
  return operation.jobId === null && UPLOAD_OUTCOME_PHASES.includes(operation.phase);
};

export const isUploadInFlight = (operation: ImportOperation): boolean => {
  return operation.jobId === null && UPLOAD_IN_FLIGHT_PHASES.includes(operation.phase);
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

export const isPolling = (operation: ImportOperation | null): boolean => {
  return operation !== null && operation.jobId !== null && POLLING_PHASES.includes(operation.phase);
};

/** The check passed: the draft holds its format, its key and its server name. */
export const isConfirmedDraft = (draft: ImportDraft | null): draft is ConfirmedDraft => {
  return draft?.phase === 'confirming' || draft?.phase === 'replacing_previous';
};

/** A new statement waits for the previous one to leave the server before it is sent. */
export const isReplacingPrevious = (
  draft: ImportDraft | null
): draft is ImportDraft & {phase: 'replacing_previous'} => {
  return draft?.phase === 'replacing_previous';
};

const isBadgePhase = (phase: ImportPhase): phase is BadgePhase => !PRE_SEND_PHASES.includes(phase);

/** The pre-send phases have no badge. */
export const toBadgePhase = (phase: ImportPhase): BadgePhase | null => {
  if (isBadgePhase(phase)) {
    return phase;
  }
  return null;
};
