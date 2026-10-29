import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';

export type StatementFormat = 'pdf' | 'csv';

/**
 * Phases of the one import the app works on. `validating`, `rejected`, `confirming` and
 * `replacing_previous` exist only in memory, before anything is sent; every phase from
 * `uploading` on is stored on the phone.
 */
export type ImportPhase =
  | 'validating'
  | 'rejected'
  | 'confirming'
  | 'replacing_previous'
  | 'uploading'
  | 'reconnecting'
  | 'server_unavailable'
  | 'not_received'
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'deleting'
  | 'delete_failed'
  | 'deleted'
  | 'gone_on_server';

/** Why an operation stopped in `failed`. */
export type ImportFailure =
  {reason: 'server_rejected'; httpStatus: number | null} | {reason: 'file_missing'};

export type StatementFile = {
  sizeBytes: number;
  format: StatementFormat;
};

/**
 * The minimal state stored on the phone. It never holds the original file name, the file bytes
 * or the payments: the on-screen title is built from the date, format and size, and the
 * payments are read from the server again after a restart.
 */
export type ImportOperation = {
  /** Local id, also the name of the private file copy. */
  operationId: string;
  /** Created once and stored before the first POST. */
  idempotencyKey: string;
  /** Created and stored before the first DELETE, then reused by every retry. */
  deleteKey: string | null;
  phase: ImportPhase;
  jobId: string | null;
  /** The last revision accepted from the server. */
  revision: number;
  /** The status that came with that revision, to return to it after the server was silent. */
  serverStatus: IMPORT_STATUS | null;
  failure: ImportFailure | null;
  file: StatementFile;
  /** Generated ASCII name for X-File-Name, e.g. statement-20261029-1432.pdf. */
  serverFileName: string;
  createdAt: string;
  updatedAt: string;
};

/** An upload cancelled before its outcome was known: deleted on the server if it got there. */
export type PendingCleanup = {
  idempotencyKey: string;
  jobId: string | null;
  deleteKey: string | null;
};
