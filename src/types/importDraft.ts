import {RecurringItem} from '@/src/types/importApi';
import {ImportOperation, StatementFormat} from '@/src/types/importOperation';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';

type ImportDraftPhase = 'validating' | 'rejected' | 'confirming' | 'replacing_previous';

/** A picked statement before it is sent. It lives in memory only and is never stored. */
export type ImportDraft = {
  operationId: string;
  phase: ImportDraftPhase;
  /** The picked file name, shown only on IMPORT_CONFIRM: never stored, logged or sent. */
  originalName: string;
  sizeBytes: number;
  format: StatementFormat | null;
  rejection: STATEMENT_REJECTION | null;
  /** Created once, when the check passes and IMPORT_CONFIRM can offer "Send". */
  idempotencyKey: string | null;
  serverFileName: string | null;
  createdAt: string;
  /** The previous statement could not be deleted, so this one was not sent. */
  isReplacementBlocked: boolean;
};

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
