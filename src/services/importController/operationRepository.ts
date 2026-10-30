import {ImportOperation, ImportPhase, PendingCleanup} from '@/src/types/importOperation';
import {STORED_PHASES} from '@/src/utils/import/importPhases';
import {isRecord, parseJson} from '@/src/utils/json/parseJson';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

type OperationSnapshot = {
  operation: ImportOperation | null;
  pendingCleanups: PendingCleanup[];
};

export type OperationRepository = {
  load: () => Promise<OperationSnapshot>;
  /** Resolves only once the snapshot is written. */
  save: (snapshot: OperationSnapshot) => Promise<void>;
};

/** The part of AsyncStorage the repository needs, so tests can pass an in-memory one. */
export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/** The AsyncStorage key of the stored import state. */
export const OPERATION_STORAGE_KEY = 'billduck.import_operation.v1';
const EMPTY_SNAPSHOT: OperationSnapshot = {operation: null, pendingCleanups: []};

const isStoredPhase = (value: unknown): value is ImportPhase => {
  return typeof value === 'string' && STORED_PHASES.some((phase) => phase === value);
};

const isStatementFile = (value: unknown): boolean => {
  return (
    isRecord(value) &&
    typeof value.sizeBytes === 'number' &&
    (value.format === 'pdf' || value.format === 'csv')
  );
};

const isOperation = (value: unknown): value is ImportOperation => {
  return (
    isRecord(value) &&
    typeof value.operationId === 'string' &&
    typeof value.idempotencyKey === 'string' &&
    typeof value.serverFileName === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.revision === 'number' &&
    isStatementFile(value.file) &&
    isStoredPhase(value.phase)
  );
};

const isPendingCleanup = (value: unknown): value is PendingCleanup => {
  return isRecord(value) && typeof value.idempotencyKey === 'string';
};

/** The stored JSON passes a typed guard; anything else is treated as a damaged record. */
const readSnapshot = (raw: string): OperationSnapshot | null => {
  const value = parseJson(raw);
  if (!isRecord(value)) {
    return null;
  }
  const operation = value.operation ?? null;
  const pendingCleanups = value.pendingCleanups ?? [];
  if (operation !== null && !isOperation(operation)) {
    return null;
  }
  if (!Array.isArray(pendingCleanups) || !pendingCleanups.every(isPendingCleanup)) {
    return null;
  }
  return {operation, pendingCleanups};
};

/**
 * The only writer of the import state on disk. `save` resolves after the write, so the caller
 * can wait for the key to be on disk before the first POST.
 */
export const createOperationRepository = (storage: KeyValueStorage): OperationRepository => ({
  load: async () => {
    const raw = await storage.getItem(OPERATION_STORAGE_KEY);
    if (raw === null) {
      return EMPTY_SNAPSHOT;
    }
    const snapshot = readSnapshot(raw);
    if (!snapshot) {
      logger.w(LOG_NAME.warning_log, {type: LOG_TYPE.restore_operation});
      await storage.removeItem(OPERATION_STORAGE_KEY);
      return EMPTY_SNAPSHOT;
    }
    return snapshot;
  },
  save: async (snapshot) => {
    if (snapshot.operation === null && snapshot.pendingCleanups.length === 0) {
      await storage.removeItem(OPERATION_STORAGE_KEY);
      return;
    }
    await storage.setItem(OPERATION_STORAGE_KEY, JSON.stringify(snapshot));
  }
});
