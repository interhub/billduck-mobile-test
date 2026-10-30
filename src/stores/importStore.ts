import {ImportDraft, ImportOutcome, StatementPayments} from '@/src/types/importDraft';
import {ImportOperation, PendingCleanup} from '@/src/types/importOperation';
import {TimelineEntry} from '@/src/utils/import/importTimeline';
import {createZustandStorageHook} from '@/src/utils/store/createZustandStore';

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
  isPollingSilent: boolean;
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
  isPollingSilent: false,
  lastAnswerAt: null,
  outcome: null,
  nextEntryId: 1
};

/**
 * The UI mirror of the import. Only the import controller writes it; screens read it. It is a
 * session store: the repository owns the disk and waits for every write.
 */
export const useImportStore = createZustandStorageHook<ImportStoreState>(
  () => INITIAL_IMPORT_STATE
);

export type ImportStoreApi = typeof useImportStore;
