import {padTwoDigits} from '@/src/utils/format/formatDate';

/** A local moment as `20261029-1432`: digits and one hyphen, safe inside a file name. */
export const formatFileStamp = (moment: Date): string => {
  const datePart = [
    moment.getFullYear(),
    padTwoDigits(moment.getMonth() + 1),
    padTwoDigits(moment.getDate())
  ].join('');
  const timePart = padTwoDigits(moment.getHours()) + padTwoDigits(moment.getMinutes());
  return `${datePart}-${timePart}`;
};
