import {RecurringItem} from '@/src/types/importApi';
import {ImportOperation, PendingCleanup, StatementFormat} from '@/src/types/importOperation';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {TimelineEntry} from '@/src/utils/import/importTimeline';
import {
  createZustandStorageHook,
  STORAGE_NAME,
  STORAGE_TYPE
} from '@/src/utils/store/createZustandStore';

export type ImportDraftPhase = 'validating' | 'rejected' | 'confirming' | 'replacing_previous';

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

export type ImportStoreState = {
  /** True once the stored operation was read at launch. */
  isRestored: boolean;
  /** Mirror of the stored operation: written only after the repository has stored it. */
  operation: ImportOperation | null;
  pendingCleanups: PendingCleanup[];
  draft: ImportDraft | null;
  /** Payments of a ready job, never stored: read from the server again after a restart. */
  payments: StatementPayments | null;
  /** Server answers of the current import, for the status screen. */
  timeline: TimelineEntry[];
  /** Every event of this launch, for the diagnostics screen. */
  journal: TimelineEntry[];
  staleSkippedCount: number;
  /** Two status reads in a row got no answer. */
  isReconnecting: boolean;
  lastAnswerAt: string | null;
  outcome: ImportOutcome | null;
  nextEntryId: number;
};

export const INITIAL_IMPORT_STATE: ImportStoreState = {
  isRestored: false,
  operation: null,
  pendingCleanups: [],
  draft: null,
  payments: null,
  timeline: [],
  journal: [],
  staleSkippedCount: 0,
  isReconnecting: false,
  lastAnswerAt: null,
  outcome: null,
  nextEntryId: 1
};

/**
 * The UI mirror of the import. Only the import controller writes it; screens read it. It is a
 * session store: the repository owns the disk and waits for every write.
 */
export const useImportStore = createZustandStorageHook<ImportStoreState>(
  () => INITIAL_IMPORT_STATE,
  {
    storeName: STORAGE_NAME.IMPORT_STORE,
    storeType: STORAGE_TYPE.SESSION
  }
);

export type ImportStoreApi = typeof useImportStore;
