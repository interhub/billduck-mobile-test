import {buildServerFileName} from '@/src/utils/files/buildServerFileName';

describe('buildServerFileName', () => {
  it('builds statement-YYYYMMDD-HHMM with the format as the extension, from the local time', () => {
    expect(buildServerFileName(new Date(2026, 9, 29, 14, 32), 'pdf')).toBe(
      'statement-20261029-1432.pdf'
    );
    expect(buildServerFileName(new Date(2026, 0, 5, 7, 4), 'csv')).toBe(
      'statement-20260105-0704.csv'
    );
  });

  it('uses only Latin letters, digits, a hyphen and a dot, safe for an HTTP header', () => {
    expect(buildServerFileName(new Date(2026, 9, 29, 14, 32), 'csv')).toMatch(/^[a-z0-9.-]+$/);
  });
});
