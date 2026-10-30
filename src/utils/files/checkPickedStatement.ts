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

/**
 * Checks the private copy of a picked statement before any network: the size the picker
 * reported, then the real size, then only the first bytes. The name and type choose the wording
 * of a refusal, never the verdict. A reported size can only refuse a file: an unknown or empty
 * report proves nothing until the copy is measured.
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
  const sizeBytes = files.readCopySize(operationId);
  if (sizeBytes === null) {
    return {success: false, reason: STATEMENT_REJECTION.UNREADABLE, sizeBytes: reportedSize};
  }
  const fileCheck = checkStatementFile({
    sizeBytes,
    readHeader: () => files.readCopyHeader(operationId, LIMITS.FORMAT_HEADER_BYTES),
    claimsPdf: claimsToBePdf(picked.originalName, picked.mimeType)
  });
  if (!fileCheck.success) {
    return {success: false, reason: fileCheck.reason, sizeBytes};
  }
  return {success: true, format: fileCheck.format, sizeBytes};
};
