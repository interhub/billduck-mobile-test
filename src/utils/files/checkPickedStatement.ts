import {LIMITS} from '@/src/constants/LIMITS';
import {StatementFormat} from '@/src/types/importOperation';
import {PickedStatement, StatementFileStore} from '@/src/types/statementFiles';
import {
  checkStatementFile,
  checkStatementSize,
  claimsToBePdf,
  STATEMENT_REJECTION
} from '@/src/utils/files/checkStatementFile';

/** The verdict on a picked file, with the size the screen shows next to it. */
type PickedStatementVerdict =
  | {success: true; format: StatementFormat; sizeBytes: number}
  | {success: false; reason: STATEMENT_REJECTION; sizeBytes: number};

/** The first bytes of the copy; null when the copy is gone or could not be read. */
const readHeaderBytes = (files: StatementFileStore, operationId: string): Uint8Array | null => {
  const headerRead = files.readCopyHeader(operationId, LIMITS.FORMAT_HEADER_BYTES);
  if (!headerRead.success) {
    return null;
  }
  return headerRead.payload;
};

/**
 * Checks the private copy of a picked statement before any network: the size the picker
 * reported, then the real size, then only the first bytes. The name and type choose the wording
 * of a refusal, never the verdict. A reported size can only refuse a file: an unknown or empty
 * report proves nothing until the copy is measured. A copy that is gone and one that could not be
 * read are both refused as unreadable.
 */
export const checkPickedStatement = (
  files: StatementFileStore,
  operationId: string,
  picked: PickedStatement
): PickedStatementVerdict => {
  const reportedSize = picked.reportedSizeBytes ?? 0;
  if (checkStatementSize(reportedSize) === STATEMENT_REJECTION.TOO_LARGE) {
    return {success: false, reason: STATEMENT_REJECTION.TOO_LARGE, sizeBytes: reportedSize};
  }
  const sizeRead = files.readCopySize(operationId);
  if (!sizeRead.success || sizeRead.payload === null) {
    return {success: false, reason: STATEMENT_REJECTION.UNREADABLE, sizeBytes: reportedSize};
  }
  const sizeBytes = sizeRead.payload;
  const fileCheck = checkStatementFile({
    sizeBytes,
    readHeader: () => readHeaderBytes(files, operationId),
    claimsPdf: claimsToBePdf(picked.originalName, picked.mimeType)
  });
  if (!fileCheck.success) {
    return {success: false, reason: fileCheck.reason, sizeBytes};
  }
  return {success: true, format: fileCheck.format, sizeBytes};
};
