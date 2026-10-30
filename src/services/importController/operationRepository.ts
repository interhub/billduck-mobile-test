import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ApiResult} from '@/src/types/importApi';
import {
  ImportFailure,
  ImportOperation,
  ImportPhase,
  PendingCleanup
} from '@/src/types/importOperation';
import {resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';
import {STORED_PHASES} from '@/src/utils/import/importPhases';
import {isRecord, parseJson} from '@/src/utils/json/parseJson';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

type OperationSnapshot = {
  operation: ImportOperation | null;
  pendingCleanups: PendingCleanup[];
};

export type OperationRepository = {
  /** The stored snapshot; a damaged record reads as empty. A storage failure is a result. */
  load: () => Promise<ApiResult<OperationSnapshot>>;
  /** Resolves only once the snapshot is written, or with the failure that kept it off the disk. */
  save: (snapshot: OperationSnapshot) => Promise<ApiResult<true>>;
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
const IMPORT_STATUSES: readonly string[] = Object.values(IMPORT_STATUS);

const isStoredPhase = (value: unknown): value is ImportPhase => {
  return typeof value === 'string' && STORED_PHASES.some((phase) => phase === value);
};

const isTextOrNull = (value: unknown): value is string | null => {
  return value === null || typeof value === 'string';
};

const isStatusOrNull = (value: unknown): value is IMPORT_STATUS | null => {
  return value === null || (typeof value === 'string' && IMPORT_STATUSES.includes(value));
};

const isFailureOrNull = (value: unknown): value is ImportFailure | null => {
  if (value === null) {
    return true;
  }
  if (!isRecord(value)) {
    return false;
  }
  if (value.reason === 'file_missing') {
    return true;
  }
  return (
    value.reason === 'server_rejected' &&
    (value.httpStatus === null || typeof value.httpStatus === 'number')
  );
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
    isTextOrNull(value.deleteKey) &&
    isStoredPhase(value.phase) &&
    isTextOrNull(value.jobId) &&
    typeof value.revision === 'number' &&
    isStatusOrNull(value.serverStatus) &&
    isFailureOrNull(value.failure) &&
    isStatementFile(value.file) &&
    typeof value.serverFileName === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

const isPendingCleanup = (value: unknown): value is PendingCleanup => {
  return (
    isRecord(value) &&
    typeof value.idempotencyKey === 'string' &&
    isTextOrNull(value.jobId) &&
    isTextOrNull(value.deleteKey)
  );
};

/** The stored JSON passes a typed guard; anything else is treated as a damaged record. */
const readSnapshot = (storedJson: string): OperationSnapshot | null => {
  const value = parseJson(storedJson);
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

const loadSnapshot = async (storage: KeyValueStorage): Promise<OperationSnapshot> => {
  const storedJson = await storage.getItem(OPERATION_STORAGE_KEY);
  if (storedJson === null) {
    return EMPTY_SNAPSHOT;
  }
  const snapshot = readSnapshot(storedJson);
  if (snapshot) {
    return snapshot;
  }
  logger.w(LOG_NAME.warning_log, {type: LOG_TYPE.restore_operation});
  await storage.removeItem(OPERATION_STORAGE_KEY);
  return EMPTY_SNAPSHOT;
};

const writeSnapshot = async (storage: KeyValueStorage, snapshot: OperationSnapshot) => {
  if (snapshot.operation === null && snapshot.pendingCleanups.length === 0) {
    await storage.removeItem(OPERATION_STORAGE_KEY);
    return;
  }
  await storage.setItem(OPERATION_STORAGE_KEY, JSON.stringify(snapshot));
};

/**
 * The only writer of the import state on disk. `save` resolves after the write, so the caller
 * can wait for the key to be on disk before the first POST. Nothing here throws: a storage
 * failure comes back as a result, and the caller logs it under the step that needed the disk.
 */
export const createOperationRepository = (storage: KeyValueStorage): OperationRepository => ({
  load: async () => {
    try {
      return {success: true, payload: await loadSnapshot(storage)};
    } catch (error) {
      return {success: false, error: {kind: resolveErrorKind(error), httpStatus: null}};
    }
  },
  save: async (snapshot) => {
    try {
      await writeSnapshot(storage, snapshot);
      return {success: true, payload: true};
    } catch (error) {
      return {success: false, error: {kind: resolveErrorKind(error), httpStatus: null}};
    }
  }
});
