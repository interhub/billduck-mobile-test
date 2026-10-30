import {fetchText, HttpAnswer, runTimedRequest} from '@/src/api/importsApi/httpRequest';
import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ApiResult, ImportJob, RecurringItem} from '@/src/types/importApi';
import {ERROR_KIND, resolveHttpStatusErrorKind} from '@/src/utils/errors/resolveErrorKind';

export type FileUploadRequest = {
  url: string;
  fileUri: string;
  headers: Record<string, string>;
  signal: AbortSignal;
};

/**
 * Sends a file from disk as the raw request body and resolves with the answer, whatever its
 * status; rejects only when no answer came. The app streams the file natively, the integration
 * tests send the same bytes from Node.
 */
export type FileUploader = (request: FileUploadRequest) => Promise<HttpAnswer>;

export type CreateImportRequest = {
  fileUri: string;
  idempotencyKey: string;
  serverFileName: string;
  /** Aborted when the person cancels the upload. */
  signal?: AbortSignal;
};

const HTTP_OK = 200;
const HTTP_ACCEPTED = 202;
const HTTP_NOT_FOUND = 404;
const JOB_STATUSES: readonly string[] = Object.values(IMPORT_STATUS);
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

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
    CALENDAR_DATE.test(value.lastSeen)
  );
};

const isJobStatus = (value: unknown): value is IMPORT_STATUS => {
  return typeof value === 'string' && JOB_STATUSES.includes(value);
};

const isRevision = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
};

const parseJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
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

const failure = <T>(kind: ERROR_KIND, httpStatus: number | null): ApiResult<T> => ({
  success: false,
  error: {kind, httpStatus}
});

/** The expected status gives a job, 404 gives "not known" (null), any other status a failure. */
const toJobResult = (answer: HttpAnswer, expectedStatus: number): ApiResult<ImportJob | null> => {
  if (answer.status === HTTP_NOT_FOUND) {
    return {success: true, payload: null};
  }
  if (answer.status !== expectedStatus) {
    return failure(resolveHttpStatusErrorKind(answer.status), answer.status);
  }
  const job = readImportJob(answer.body);
  if (!job) {
    return failure(ERROR_KIND.SERVER, answer.status);
  }
  return {success: true, payload: job};
};

/** A 202 is the only success of a POST; it never means the report is ready. */
const toCreatedJob = (answer: HttpAnswer): ApiResult<ImportJob> => {
  if (answer.status !== HTTP_ACCEPTED) {
    return failure(resolveHttpStatusErrorKind(answer.status), answer.status);
  }
  const job = readImportJob(answer.body);
  if (!job) {
    return failure(ERROR_KIND.SERVER, answer.status);
  }
  return {success: true, payload: job};
};

/**
 * HTTP client of the import API. Functions never throw: a failure comes back as its kind and
 * HTTP status, never with the error text, which may carry a file path.
 */
export const createImportsApi = ({
  baseUrl,
  uploadFile
}: {
  baseUrl: string;
  uploadFile: FileUploader;
}) => {
  const createImport = async (request: CreateImportRequest): Promise<ApiResult<ImportJob>> => {
    const outcome = await runTimedRequest(
      (signal) =>
        uploadFile({
          url: `${baseUrl}/imports`,
          fileUri: request.fileUri,
          headers: {
            'Content-Type': 'application/octet-stream',
            'Idempotency-Key': request.idempotencyKey,
            'X-File-Name': request.serverFileName
          },
          signal
        }),
      LIMITS.UPLOAD_TIMEOUT_MS,
      request.signal
    );
    if (!outcome.success) {
      return failure(outcome.kind, null);
    }
    return toCreatedJob(outcome.answer);
  };

  const readJob = async (
    url: string,
    init: RequestInit,
    expectedStatus: number
  ): Promise<ApiResult<ImportJob | null>> => {
    const outcome = await runTimedRequest(
      (signal) => fetchText(url, init, signal),
      LIMITS.REQUEST_TIMEOUT_MS
    );
    if (!outcome.success) {
      return failure(outcome.kind, null);
    }
    return toJobResult(outcome.answer, expectedStatus);
  };

  /** Null payload: the server does not know the key at this instant. */
  const getImportByKey = (idempotencyKey: string) =>
    readJob(
      `${baseUrl}/imports/by-key/${encodeURIComponent(idempotencyKey)}`,
      {method: 'GET'},
      HTTP_OK
    );

  /** Null payload: the server does not know this job id. */
  const getImport = (jobId: string) =>
    readJob(`${baseUrl}/imports/${encodeURIComponent(jobId)}`, {method: 'GET'}, HTTP_OK);

  /** Null payload: the server does not know this job id. */
  const deleteImport = (jobId: string, deleteKey: string) =>
    readJob(
      `${baseUrl}/imports/${encodeURIComponent(jobId)}`,
      {method: 'DELETE', headers: {'Idempotency-Key': deleteKey}},
      HTTP_ACCEPTED
    );

  return {createImport, getImportByKey, getImport, deleteImport};
};

export type ImportsApi = ReturnType<typeof createImportsApi>;
