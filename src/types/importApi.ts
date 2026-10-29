import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

/** One payment the server found repeating in the statement. Amounts are in minor units. */
export type RecurringItem = {
  id: string;
  merchant: string;
  amountMinor: number;
  cadence: string;
  /** A calendar date, `YYYY-MM-DD`. */
  lastSeen: string;
};

/** A job as every server answer describes it: POST, GET by key, GET by id and DELETE. */
export type ImportJob = {
  jobId: string;
  status: IMPORT_STATUS;
  revision: number;
  currency: string | null;
  /** Present only when the job is ready. */
  items: RecurringItem[] | null;
};

export type ApiError = {
  kind: ERROR_KIND;
  httpStatus: number | null;
};

/** Network and file functions never throw: they return the payload or the classified failure. */
export type ApiResult<T> = {success: true; payload: T} | {success: false; error: ApiError};
