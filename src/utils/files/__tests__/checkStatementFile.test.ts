import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {LIMITS} from '@/src/constants/LIMITS';
import {
  checkStatementFile,
  claimsToBePdf,
  detectStatementFormat,
  STATEMENT_REJECTION
} from '@/src/utils/files/checkStatementFile';

const FIXTURES = join(__dirname, '../../../../mobile-engineer-candidate-kit/fixtures');
const readFixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(join(FIXTURES, name)));
const ascii = (text: string): Uint8Array => Uint8Array.from(text, (char) => char.charCodeAt(0));
const header = (bytes: Uint8Array) => bytes.subarray(0, LIMITS.FORMAT_HEADER_BYTES);

describe('detectStatementFormat on the kit fixtures', () => {
  it('accepts statement.pdf and statement.csv by their first bytes', () => {
    expect(detectStatementFormat(header(readFixture('statement.pdf')))).toBe('pdf');
    expect(detectStatementFormat(header(readFixture('statement.csv')))).toBe('csv');
  });

  it('refuses spoofed.pdf: text that only pretends to be a PDF', () => {
    expect(detectStatementFormat(header(readFixture('spoofed.pdf')))).toBeNull();
  });
});

describe('detectStatementFormat, the same rules as the server', () => {
  it('refuses a CSV with \\r\\n line ends', () => {
    expect(detectStatementFormat(ascii('date,description,amount\r\n2026-09-01'))).toBeNull();
  });

  it('refuses a CSV that starts with a byte order mark', () => {
    const csv = ascii('date,description,amount\n2026-09-01');
    expect(detectStatementFormat(Uint8Array.from([0xef, 0xbb, 0xbf, ...csv]))).toBeNull();
  });

  it('refuses a header in another case', () => {
    expect(detectStatementFormat(ascii('Date,Description,Amount\n'))).toBeNull();
  });
});

describe('checkStatementFile', () => {
  const csvHeader = header(readFixture('statement.csv'));

  it('accepts exactly 10 MiB', () => {
    expect(
      checkStatementFile({
        sizeBytes: LIMITS.MAX_FILE_SIZE_BYTES,
        header: csvHeader,
        claimsPdf: false
      })
    ).toEqual({
      success: true,
      format: 'csv'
    });
  });

  it('refuses 10 MiB and one byte without looking at the bytes', () => {
    expect(
      checkStatementFile({
        sizeBytes: LIMITS.MAX_FILE_SIZE_BYTES + 1,
        header: null,
        claimsPdf: false
      })
    ).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.TOO_LARGE
    });
  });

  it('refuses an empty file', () => {
    expect(checkStatementFile({sizeBytes: 0, header: new Uint8Array(), claimsPdf: false})).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.EMPTY
    });
  });

  it('calls spoofed.pdf a fake PDF and the same text under another name unsupported', () => {
    const spoofed = header(readFixture('spoofed.pdf'));
    expect(checkStatementFile({sizeBytes: 84, header: spoofed, claimsPdf: true})).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.FAKE_PDF
    });
    expect(checkStatementFile({sizeBytes: 84, header: spoofed, claimsPdf: false})).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.UNSUPPORTED
    });
  });

  it('refuses a file whose bytes could not be read', () => {
    expect(checkStatementFile({sizeBytes: 112, header: null, claimsPdf: false})).toEqual({
      success: false,
      reason: STATEMENT_REJECTION.UNREADABLE
    });
  });

  it('trusts the bytes over the name: real CSV bytes under a .pdf name pass as CSV', () => {
    expect(checkStatementFile({sizeBytes: 112, header: csvHeader, claimsPdf: true})).toEqual({
      success: true,
      format: 'csv'
    });
  });
});

describe('claimsToBePdf', () => {
  it('reads the extension in any case and the PDF type', () => {
    expect(claimsToBePdf('Выписка за октябрь.PDF', null)).toBe(true);
    expect(claimsToBePdf('statement', 'application/pdf')).toBe(true);
    expect(claimsToBePdf('statement.csv', 'text/csv')).toBe(false);
  });
});
