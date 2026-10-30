import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob, RecurringItem} from '@/src/types/importApi';
import {CALENDAR_DATE_PATTERN} from '@/src/utils/format/formatDate';
import {isRecord, parseJson} from '@/src/utils/json/parseJson';

const JOB_STATUSES: readonly string[] = Object.values(IMPORT_STATUS);

const isRecurringItem = (value: unknown): value is RecurringItem => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.merchant === 'string' &&
    Number.isInteger(value.amountMinor) &&
    typeof value.cadence === 'string' &&
    typeof value.lastSeen === 'string' &&
    CALENDAR_DATE_PATTERN.test(value.lastSeen)
  );
};

const isJobStatus = (value: unknown): value is IMPORT_STATUS => {
  return typeof value === 'string' && JOB_STATUSES.includes(value);
};

const isRevision = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
};

const readItems = (value: Record<string, unknown>): RecurringItem[] | null => {
  const {items} = value;
  if (!Array.isArray(items) || !items.every(isRecurringItem)) {
    return null;
  }
  return items;
};

const readCurrency = (value: Record<string, unknown>): string | null => {
  const {currency} = value;
  if (typeof currency !== 'string') {
    return null;
  }
  return currency;
};

/** Reads a job from an answer body; anything that breaks the contract is unreadable (null). */
export const readImportJob = (body: string): ImportJob | null => {
  const value = parseJson(body);
  if (!isRecord(value) || typeof value.jobId !== 'string') {
    return null;
  }
  if (!isJobStatus(value.status) || !isRevision(value.revision)) {
    return null;
  }
  const job: ImportJob = {
    jobId: value.jobId,
    status: value.status,
    revision: value.revision,
    currency: readCurrency(value),
    items: null
  };
  if (job.status !== IMPORT_STATUS.READY) {
    return job;
  }
  const items = readItems(value);
  if (!items || job.currency === null) {
    return null;
  }
  return {...job, items};
};
