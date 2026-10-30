import {
  copyFileSync,
  existsSync,
  openSync,
  closeSync,
  readdirSync,
  readSync,
  rmSync,
  statSync
} from 'node:fs';
import path from 'node:path';
import {KeyValueStorage} from '@/src/services/importController/operationRepository';
import {ApiResult} from '@/src/types/importApi';
import {StatementFileStore} from '@/src/types/statementFiles';
import {resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';

/** A fixture waiting in the picker: its path, the name and the type the picker reports. */
export type QueuedFixturePick = {source: string; name: string; mimeType: string | null};

/** AsyncStorage of one phone, in memory. */
export const createMemoryStorage = (): KeyValueStorage => {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    }
  };
};

const readFileHeader = (filePath: string, length: number): Uint8Array => {
  const descriptor = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const bytesRead = readSync(descriptor, buffer, 0, length, 0);
    return new Uint8Array(buffer.subarray(0, bytesRead));
  } finally {
    closeSync(descriptor);
  }
};

/** Reads a copy as the phone does: no copy is a null payload, a read that throws a failure. */
const readCopy = <T>(filePath: string, read: (existingPath: string) => T): ApiResult<T | null> => {
  try {
    if (!existsSync(filePath)) {
      return {success: true, payload: null};
    }
    return {success: true, payload: read(filePath)};
  } catch (error) {
    return {success: false, error: {kind: resolveErrorKind(error), httpStatus: null}};
  }
};

/**
 * Private copies in a temp folder, named by operation id, like `Paths.cache/imports/` on the phone.
 * The picker hands out the queued fixtures in order; an empty queue is a cancelled picker.
 */
export const createNodeFileStore = (directory: string) => {
  const picks: QueuedFixturePick[] = [];
  const copyPath = (operationId: string) => path.join(directory, operationId);
  const files: StatementFileStore = {
    pickStatement: async (operationId) => {
      const next = picks.shift();
      if (!next) {
        return {success: true, payload: null};
      }
      copyFileSync(next.source, copyPath(operationId));
      return {
        success: true,
        payload: {
          originalName: next.name,
          mimeType: next.mimeType,
          reportedSizeBytes: statSync(next.source).size
        }
      };
    },
    readCopySize: (operationId) =>
      readCopy(copyPath(operationId), (filePath) => statSync(filePath).size),
    readCopyHeader: (operationId, length) =>
      readCopy(copyPath(operationId), (filePath) => readFileHeader(filePath, length)),
    hasCopy: (operationId) => ({success: true, payload: existsSync(copyPath(operationId))}),
    getCopyUri: (operationId) => copyPath(operationId),
    removeCopy: (operationId) => {
      rmSync(copyPath(operationId), {force: true});
    },
    removeAllExcept: (operationIds) => {
      for (const fileName of readdirSync(directory)) {
        if (!operationIds.includes(fileName)) {
          rmSync(path.join(directory, fileName), {force: true});
        }
      }
    }
  };
  return {files, picks, listCopies: () => readdirSync(directory)};
};
