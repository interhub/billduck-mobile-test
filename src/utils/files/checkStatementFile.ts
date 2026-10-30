import {LIMITS} from '@/src/constants/LIMITS';
import {StatementFormat} from '@/src/types/importOperation';

export enum STATEMENT_REJECTION {
  EMPTY = 'empty',
  TOO_LARGE = 'too_large',
  /** The name or the type says PDF, the bytes say otherwise. */
  FAKE_PDF = 'fake_pdf',
  UNSUPPORTED = 'unsupported',
  /** The picked file could not be copied, opened or read. */
  UNREADABLE = 'unreadable'
}

type StatementCheckResult =
  {success: true; format: StatementFormat} | {success: false; reason: STATEMENT_REJECTION};

type StatementCandidate = {
  sizeBytes: number;
  /** The first bytes of the file; null when they could not be read. */
  header: Uint8Array | null;
  /** Whether the picked name or type claims a PDF: it picks the message, never the verdict. */
  claimsPdf: boolean;
};

const PDF_SIGNATURE = '%PDF-';
const CSV_HEADER = 'date,description,amount\n';

/** Bytes as Latin-1 text: enough to compare an ASCII signature without decoding the file. */
const bytesToLatin1 = (bytes: Uint8Array): string => {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
};

/**
 * Recognises the format exactly as the server does: a PDF starts with `%PDF-`; a CSV has
 * `date,description,amount\n` in its first 24 bytes once every `\r` is removed. A CSV with
 * `\r\n` line ends or with a byte order mark is therefore refused here, as it is there.
 */
export const detectStatementFormat = (header: Uint8Array): StatementFormat | null => {
  const text = bytesToLatin1(header.subarray(0, LIMITS.FORMAT_HEADER_BYTES));
  if (text.startsWith(PDF_SIGNATURE)) {
    return 'pdf';
  }
  if (text.replace(/\r/g, '').startsWith(CSV_HEADER)) {
    return 'csv';
  }
  return null;
};

/** The size is checked before a single byte is read. */
export const checkStatementSize = (sizeBytes: number): STATEMENT_REJECTION | null => {
  if (sizeBytes <= 0) {
    return STATEMENT_REJECTION.EMPTY;
  }
  if (sizeBytes > LIMITS.MAX_FILE_SIZE_BYTES) {
    return STATEMENT_REJECTION.TOO_LARGE;
  }
  return null;
};

const rejectFormat = (claimsPdf: boolean): StatementCheckResult => {
  if (claimsPdf) {
    return {success: false, reason: STATEMENT_REJECTION.FAKE_PDF};
  }
  return {success: false, reason: STATEMENT_REJECTION.UNSUPPORTED};
};

/** The verdict before any network: size first, then the first bytes, never the extension or MIME. */
export const checkStatementFile = ({
  sizeBytes,
  header,
  claimsPdf
}: StatementCandidate): StatementCheckResult => {
  const sizeRejection = checkStatementSize(sizeBytes);
  if (sizeRejection) {
    return {success: false, reason: sizeRejection};
  }
  if (!header) {
    return {success: false, reason: STATEMENT_REJECTION.UNREADABLE};
  }
  const format = detectStatementFormat(header);
  if (!format) {
    return rejectFormat(claimsPdf);
  }
  return {success: true, format};
};

/** A `.pdf` name or a PDF type only chooses the wording of a refusal. */
export const claimsToBePdf = (fileName: string, mimeType: string | null): boolean => {
  return fileName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
};
