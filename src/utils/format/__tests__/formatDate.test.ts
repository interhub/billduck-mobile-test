import {LANGUAGE} from '@/src/i18n/translations';
import {
  formatCalendarDate,
  formatLocalDateTime,
  formatLocalTime
} from '@/src/utils/format/formatDate';

describe('formatCalendarDate', () => {
  it('formats server dates as calendar days in both languages', () => {
    expect(formatCalendarDate('2026-10-01', LANGUAGE.EN)).toBe('1 Oct 2026');
    expect(formatCalendarDate('2026-10-03', LANGUAGE.RU)).toBe('3 окт 2026');
  });

  it('never shifts the day west of UTC, where new Date() would show the previous one', () => {
    expect(new Date('2026-10-01').getDate()).toBe(30);
    expect(formatCalendarDate('2026-10-01', LANGUAGE.EN)).toBe('1 Oct 2026');
  });

  it('returns an unexpected value as it is', () => {
    expect(formatCalendarDate('soon', LANGUAGE.EN)).toBe('soon');
  });
});

describe('local moments', () => {
  const moment = new Date(2026, 9, 29, 14, 32, 7).toISOString();

  it('formats the date and time of an upload', () => {
    expect(formatLocalDateTime(moment, LANGUAGE.EN)).toBe('29 Oct, 14:32');
    expect(formatLocalDateTime(moment, LANGUAGE.RU)).toBe('29 окт, 14:32');
  });

  it('formats the time of a server answer with seconds', () => {
    expect(formatLocalTime(moment)).toBe('14:32:07');
  });
});
