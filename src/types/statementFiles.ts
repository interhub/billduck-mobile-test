import {ApiResult} from '@/src/types/importApi';

/** What the system picker reported about the chosen file. The name stays in memory only. */
export type PickedStatement = {
  originalName: string;
  mimeType: string | null;
  /** The size the picker reported, checked before anything is read; null when unknown. */
  reportedSizeBytes: number | null;
};

/**
 * The private file copies of the import, kept under the operation id and never under the
 * original name. The app passes a native store; tests pass one on top of Node's file system.
 * A read tells a missing copy (a successful null or false) from a copy it could not read (a
 * failure), so a read failure is never taken for an erased file.
 */
export type StatementFileStore = {
  /**
   * Opens the system picker and moves the chosen file into the private folder under the
   * operation id. Null payload: the person cancelled. Failure: the file could not be copied.
   */
  pickStatement: (operationId: string) => Promise<ApiResult<PickedStatement | null>>;
  /** Size of the private copy in bytes. Null payload: there is no copy. */
  readCopySize: (operationId: string) => ApiResult<number | null>;
  /** The first bytes of the private copy, without reading the rest. Null payload: no copy. */
  readCopyHeader: (operationId: string, length: number) => ApiResult<Uint8Array | null>;
  /** Whether the private copy is still there. */
  hasCopy: (operationId: string) => ApiResult<boolean>;
  getCopyUri: (operationId: string) => string;
  removeCopy: (operationId: string) => void;
  /** Removes every private copy and picker leftover except the copies of the listed operations. */
  removeAllExcept: (operationIds: string[]) => void;
};

export type AppActivity = {
  isActive: () => boolean;
  /** Resolves at once in the foreground, otherwise when the app returns there. */
  whenActive: () => Promise<void>;
};
