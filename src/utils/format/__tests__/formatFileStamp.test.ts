import {formatFileStamp} from '@/src/utils/format/formatFileStamp';

describe('formatFileStamp', () => {
  it('writes the local date and time as YYYYMMDD-HHMM with leading zeros', () => {
    expect(formatFileStamp(new Date(2026, 9, 29, 14, 32))).toBe('20261029-1432');
    expect(formatFileStamp(new Date(2026, 0, 5, 7, 4))).toBe('20260105-0704');
  });
});
