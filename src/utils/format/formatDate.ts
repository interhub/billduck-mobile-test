import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PART_DIGITS = 2;

const padTimePart = (value: number): string => String(value).padStart(TIME_PART_DIGITS, '0');

/**
 * A server calendar date such as `2026-10-01` -> "1 Oct 2026" / "1 окт 2026". It never goes
 * through `new Date()`, which would read it as UTC midnight and show the previous day west of UTC.
 */
export const formatCalendarDate = (calendarDate: string, language: LANGUAGE): string => {
  const match = CALENDAR_DATE.exec(calendarDate);
  if (!match) {
    return calendarDate;
  }
  const [, year, month, day] = match;
  const monthName = TRANSLATIONS[language].format.months[Number(month) - 1] ?? month;
  return `${Number(day)} ${monthName} ${year}`;
};

/** A moment in the phone's local time: "29 Oct, 14:32" / "29 окт, 14:32". */
export const formatLocalDateTime = (isoMoment: string, language: LANGUAGE): string => {
  const moment = new Date(isoMoment);
  const monthName = TRANSLATIONS[language].format.months[moment.getMonth()];
  return `${moment.getDate()} ${monthName}, ${padTimePart(moment.getHours())}:${padTimePart(moment.getMinutes())}`;
};

/** The local time with seconds, for the response timeline: "14:32:07". */
export const formatLocalTime = (isoMoment: string): string => {
  const moment = new Date(isoMoment);
  return [moment.getHours(), moment.getMinutes(), moment.getSeconds()].map(padTimePart).join(':');
};
