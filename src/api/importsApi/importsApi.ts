import {failure, failureForStatus} from '@/src/api/apiResult';
import {fetchText, HttpAnswer, runTimedRequest} from '@/src/api/importsApi/httpRequest';
import {readImportJob} from '@/src/api/importsApi/readImportJob';
import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ApiResult, ImportJob} from '@/src/types/importApi';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

type FileUploadRequest = {
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

type CreateImportRequest = {
  fileUri: string;
  idempotencyKey: string;
  serverFileName: string;
  /** Aborted when the person cancels the upload. */
  signal?: AbortSignal;
};

/** The job of an answer; a body that breaks the contract is a server fault. */
const parseJobAnswer = (answer: HttpAnswer): ApiResult<ImportJob> => {
  const job = readImportJob(answer.body);
  if (!job) {
    return failure(ERROR_KIND.SERVER, answer.status);
  }
  return {success: true, payload: job};
};

/** A 202 is the only success of a POST; it never means the report is ready. */
const toCreatedJob = (answer: HttpAnswer): ApiResult<ImportJob> => {
  if (answer.status !== HTTP_STATUS.ACCEPTED) {
    return failureForStatus(answer.status);
  }
  return parseJobAnswer(answer);
};

/** The expected status gives a job, 404 gives "not known" (null), any other status a failure. */
const toJobResult = (answer: HttpAnswer, expectedStatus: number): ApiResult<ImportJob | null> => {
  if (answer.status === HTTP_STATUS.NOT_FOUND) {
    return {success: true, payload: null};
  }
  if (answer.status !== expectedStatus) {
    return failureForStatus(answer.status);
  }
  return parseJobAnswer(answer);
};

/** One JSON request about a known job: the read by key, the read by id or the delete. */
const requestJob = async (
  url: string,
  init: RequestInit,
  expectedStatus: number
): Promise<ApiResult<ImportJob | null>> => {
  const result = await runTimedRequest(
    (signal) => fetchText(url, init, signal),
    LIMITS.REQUEST_TIMEOUT_MS
  );
  if (!result.success) {
    return result;
  }
  return toJobResult(result.payload, expectedStatus);
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
    const result = await runTimedRequest(
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
    if (!result.success) {
      return result;
    }
    return toCreatedJob(result.payload);
  };

  /** Null payload: the server does not know the key at this instant. */
  const getImportByKey = (idempotencyKey: string) =>
    requestJob(
      `${baseUrl}/imports/by-key/${encodeURIComponent(idempotencyKey)}`,
      {method: 'GET'},
      HTTP_STATUS.OK
    );

  /** Null payload: the server does not know this job id. */
  const getImport = (jobId: string) =>
    requestJob(`${baseUrl}/imports/${encodeURIComponent(jobId)}`, {method: 'GET'}, HTTP_STATUS.OK);

  /** Null payload: the server does not know this job id. */
  const deleteImport = (jobId: string, deleteKey: string) =>
    requestJob(
      `${baseUrl}/imports/${encodeURIComponent(jobId)}`,
      {method: 'DELETE', headers: {'Idempotency-Key': deleteKey}},
      HTTP_STATUS.ACCEPTED
    );

  return {createImport, getImportByKey, getImport, deleteImport};
};

export type ImportsApi = ReturnType<typeof createImportsApi>;
