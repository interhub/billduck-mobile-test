import {failure} from '@/src/api/apiResult';
import {ApiResult} from '@/src/types/importApi';
import {PickedStatement, StatementFileStore} from '@/src/types/statementFiles';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

/** The fake phone keeps its private copies under this made-up address. */
export const FAKE_COPY_URI_PREFIX = 'fake://imports/';

/** What the fake system picker hands out on its next opening. */
export type QueuedPick =
  | {kind: 'file'; name: string; mimeType: string | null; content: string; reportedSize?: number}
  | {kind: 'cancel'}
  | {kind: 'unreadable'};

/** The private folder of the fake phone, with its picker queue. */
export type FakeDisk = {
  copies: Map<string, string>;
  picks: QueuedPick[];
  /** Every read of a private copy fails, as when the system refuses to open the file. */
  isUnreadable: boolean;
};

const READ_FAILURE = failure<never>(ERROR_KIND.UNKNOWN, null);

export const createFakeDisk = (): FakeDisk => ({copies: new Map(), picks: [], isUnreadable: false});

const toBytes = (content: string, length: number): Uint8Array =>
  Uint8Array.from(content.slice(0, length), (char) => char.charCodeAt(0));

/** A read of a private copy: no copy is a null payload, a refusing disk a failure. */
const readCopy = <T>(
  disk: FakeDisk,
  operationId: string,
  read: (content: string) => T
): ApiResult<T | null> => {
  if (disk.isUnreadable) {
    return READ_FAILURE;
  }
  const content = disk.copies.get(operationId);
  if (content === undefined) {
    return {success: true, payload: null};
  }
  return {success: true, payload: read(content)};
};

/** The picker hands out the queued picks in order; an empty queue fails like a broken picker. */
const pickStatement = async (
  disk: FakeDisk,
  operationId: string
): Promise<ApiResult<PickedStatement | null>> => {
  const next = disk.picks.shift();
  if (!next || next.kind === 'unreadable') {
    return failure(ERROR_KIND.UNKNOWN, null);
  }
  if (next.kind === 'cancel') {
    return {success: true, payload: null};
  }
  disk.copies.set(operationId, next.content);
  return {
    success: true,
    payload: {
      originalName: next.name,
      mimeType: next.mimeType,
      reportedSizeBytes: next.reportedSize ?? next.content.length
    }
  };
};

export const createFakeStatementFiles = (disk: FakeDisk): StatementFileStore => ({
  pickStatement: (operationId) => pickStatement(disk, operationId),
  readCopySize: (operationId) => readCopy(disk, operationId, (content) => content.length),
  readCopyHeader: (operationId, length) =>
    readCopy(disk, operationId, (content) => toBytes(content, length)),
  hasCopy: (operationId) => {
    if (disk.isUnreadable) {
      return READ_FAILURE;
    }
    return {success: true, payload: disk.copies.has(operationId)};
  },
  getCopyUri: (operationId) => `${FAKE_COPY_URI_PREFIX}${operationId}`,
  removeCopy: (operationId) => {
    disk.copies.delete(operationId);
  },
  removeAllExcept: (operationIds) => {
    for (const operationId of [...disk.copies.keys()]) {
      if (!operationIds.includes(operationId)) {
        disk.copies.delete(operationId);
      }
    }
  }
});
