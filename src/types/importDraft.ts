import {RecurringItem} from '@/src/types/importApi';
import {ImportOperation, StatementFormat} from '@/src/types/importOperation';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';

type DraftBase = {
  operationId: string;
  /** The picked file name, shown only on IMPORT_CONFIRM: never stored, logged or sent. */
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  /** The previous statement could not be deleted, so this one was not sent. */
  isReplacementBlocked: boolean;
};

/** The picked file is being checked. */
export type CheckingDraft = DraftBase & {
  phase: 'validating';
  format: null;
  rejection: null;
  idempotencyKey: null;
  serverFileName: null;
};

/** The check refused the file before any network. */
type RejectedDraft = DraftBase & {
  phase: 'rejected';
  format: null;
  rejection: STATEMENT_REJECTION;
  idempotencyKey: null;
  serverFileName: null;
};

/** The check passed: from here on the draft has its format, its key and its server name. */
export type ConfirmedDraft = DraftBase & {
  phase: 'confirming' | 'replacing_previous';
  format: StatementFormat;
  rejection: null;
  /** Created once, when the check passes and IMPORT_CONFIRM can offer "Send". */
  idempotencyKey: string;
  serverFileName: string;
};

/** A picked statement before it is sent. It lives in memory only and is never stored. */
export type ImportDraft = CheckingDraft | RejectedDraft | ConfirmedDraft;

export type StatementPayments = {
  currency: string;
  items: RecurringItem[];
};

export type ImportOutcomeKind = 'deleted' | 'gone_on_server' | 'upload_cancelled';

/** How the last operation ended; kept in memory so the screens can say it after it left the disk. */
export type ImportOutcome = {
  kind: ImportOutcomeKind;
  operation: ImportOperation;
  at: string;
};
