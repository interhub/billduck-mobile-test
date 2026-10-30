import {LIMITS} from '@/src/constants/LIMITS';
import {ApiResult} from '@/src/types/importApi';
import {PickedStatement, StatementFileStore} from '@/src/types/statementFiles';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {checkPickedStatement} from '@/src/utils/files/checkPickedStatement';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {readFixture} from './kitFixtures';

const CSV_COPY = readFixture('statement.csv');

/** The picker reports a size of its own; only the copy proves the real one. */
const PICKED: PickedStatement = {
  originalName: 'statement.csv',
  mimeType: 'text/csv',
  reportedSizeBytes: CSV_COPY.length - 1
};

const READ_FAILURE: ApiResult<never> = {
  success: false,
  error: {kind: ERROR_KIND.UNKNOWN, httpStatus: null}
};

type CopyReads = {
  size: ApiResult<number | null>;
  header: ApiResult<Uint8Array | null>;
};

/** A file store that answers the two reads of the copy as given and does nothing else. */
const storeAnswering = ({size, header}: CopyReads): StatementFileStore => ({
  pickStatement: async () => ({success: true, payload: null}),
  readCopySize: () => size,
  readCopyHeader: () => header,
  hasCopy: () => ({success: true, payload: true}),
  getCopyUri: (operationId) => operationId,
  removeCopy: () => undefined,
  removeAllExcept: () => undefined
});

const CSV_READS: CopyReads = {
  size: {success: true, payload: CSV_COPY.length},
  header: {success: true, payload: CSV_COPY.subarray(0, LIMITS.FORMAT_HEADER_BYTES)}
};

describe('checkPickedStatement', () => {
  it('accepts a copy whose first bytes are a CSV header, with its real size', () => {
    expect(checkPickedStatement(storeAnswering(CSV_READS), 'op-1', PICKED)).toEqual({
      success: true,
      format: 'csv',
      sizeBytes: CSV_COPY.length
    });
  });

  it('refuses a copy whose size cannot be read as unreadable, with the reported size', () => {
    const files = storeAnswering({...CSV_READS, size: READ_FAILURE});
    expect(checkPickedStatement(files, 'op-1', PICKED)).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.UNREADABLE,
      sizeBytes: PICKED.reportedSizeBytes
    });
  });

  it('refuses a copy that is gone as unreadable, like one that cannot be read', () => {
    const files = storeAnswering({...CSV_READS, size: {success: true, payload: null}});
    expect(checkPickedStatement(files, 'op-1', PICKED)).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.UNREADABLE,
      sizeBytes: PICKED.reportedSizeBytes
    });
  });

  it('refuses a copy whose first bytes cannot be read as unreadable, with its real size', () => {
    const files = storeAnswering({...CSV_READS, header: READ_FAILURE});
    expect(checkPickedStatement(files, 'op-1', PICKED)).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.UNREADABLE,
      sizeBytes: CSV_COPY.length
    });
  });
});
