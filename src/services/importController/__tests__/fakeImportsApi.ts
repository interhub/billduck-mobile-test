import {failure} from '@/src/api/apiResult';
import {ImportsApi} from '@/src/api/importsApi/importsApi';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ApiResult, ImportJob} from '@/src/types/importApi';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {FakeJob, FakeServer, viewAs, viewJob} from './fakeServer';
import {FAKE_COPY_URI_PREFIX, FakeDisk} from './fakeStatementFiles';

/** Answers of the kit's mock that the app has no HTTP_STATUS member for. */
const MOCK_HTTP_STATUS = {
  CONFLICT: 409,
  UNSUPPORTED_MEDIA_TYPE: 415,
  SERVICE_UNAVAILABLE: 503
} as const;

const PDF_SIGNATURE = '%PDF-';
const CSV_HEADER = 'date,description,amount\n';

/** The request got no answer at all. */
const NETWORK_FAILURE = failure<never>(ERROR_KIND.NETWORK, null);

/** The mock's format check: the PDF signature, or the CSV header once every `\r` is removed. */
const isSupportedStatement = (bytes: string): boolean =>
  bytes.startsWith(PDF_SIGNATURE) ||
  bytes.slice(0, LIMITS.FORMAT_HEADER_BYTES).replace(/\r/g, '').startsWith(CSV_HEADER);

const findJobByKey = (server: FakeServer, key: string): FakeJob | undefined => {
  const jobId = server.byKey.get(key);
  if (jobId === undefined) {
    return undefined;
  }
  return server.jobs.get(jobId);
};

const waitForRelease = async (server: FakeServer) => {
  if (!server.holdUploads) {
    return;
  }
  await new Promise<void>((resolve) => {
    server.heldUploads.push(resolve);
  });
};

/** The same key again: the same job for the same bytes, a conflict for other bytes. */
const answerRepeat = (server: FakeServer, job: FakeJob, bytes: string): ApiResult<ImportJob> => {
  if (job.bytes !== bytes) {
    return failure(ERROR_KIND.VALIDATION, MOCK_HTTP_STATUS.CONFLICT);
  }
  server.count('duplicateHits');
  return {success: true, payload: viewAs(job.jobId, IMPORT_STATUS.QUEUED)};
};

/** A new key gives a new job; in lost_ack the job is made but its answer never arrives. */
const answerNewUpload = (server: FakeServer, key: string, bytes: string): ApiResult<ImportJob> => {
  const job = server.addJob(key, bytes);
  server.count('newJobs');
  if (server.mode === MOCK_SCENARIO.LOST_ACK) {
    return NETWORK_FAILURE;
  }
  return {success: true, payload: viewAs(job.jobId, IMPORT_STATUS.QUEUED)};
};

/** What the mock answers to bytes that reached it. */
const answerUpload = (server: FakeServer, key: string, bytes: string): ApiResult<ImportJob> => {
  server.count('createRequests');
  if (server.forcedUploadStatus !== null) {
    return failure(ERROR_KIND.VALIDATION, server.forcedUploadStatus);
  }
  if (!isSupportedStatement(bytes)) {
    return failure(ERROR_KIND.VALIDATION, MOCK_HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
  }
  const existing = findJobByKey(server, key);
  if (existing) {
    return answerRepeat(server, existing, bytes);
  }
  return answerNewUpload(server, key, bytes);
};

/** A status read; stale_status answers by the number of the read. */
const readStatus = (server: FakeServer, jobId: string): ApiResult<ImportJob | null> => {
  if (server.isOffline) {
    return NETWORK_FAILURE;
  }
  if (server.refusedReadStatus !== null) {
    return failure(ERROR_KIND.VALIDATION, server.refusedReadStatus);
  }
  const job = server.jobs.get(jobId);
  if (!job) {
    return {success: true, payload: null};
  }
  const readNumber = (server.getCounts.get(jobId) ?? 0) + 1;
  server.getCounts.set(jobId, readNumber);
  return {success: true, payload: viewJob(job, server.mode, readNumber)};
};

/** A DELETE of a known job: refused in delete_failure, a conflict for another job's key. */
const answerDelete = (
  server: FakeServer,
  job: FakeJob,
  deleteKey: string
): ApiResult<ImportJob | null> => {
  server.count('deleteRequests');
  if (server.mode === MOCK_SCENARIO.DELETE_FAILURE) {
    return failure(ERROR_KIND.SERVER, MOCK_HTTP_STATUS.SERVICE_UNAVAILABLE);
  }
  const owner = server.deleteKeys.get(deleteKey);
  if (owner && owner !== job.jobId) {
    return failure(ERROR_KIND.VALIDATION, MOCK_HTTP_STATUS.CONFLICT);
  }
  server.deleteKeys.set(deleteKey, job.jobId);
  const deleted = server.markDeleted(job);
  if (server.loseDeleteAnswers) {
    return NETWORK_FAILURE;
  }
  return {success: true, payload: viewJob(deleted, MOCK_SCENARIO.HAPPY)};
};

/** The import API on top of the fake mock; the uploaded bytes come from the fake phone's disk. */
export const createFakeImportsApi = (server: FakeServer, disk: FakeDisk): ImportsApi => ({
  createImport: async ({fileUri, idempotencyKey, serverFileName}) => {
    server.requests.push({
      method: 'POST',
      path: '/imports',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Idempotency-Key': idempotencyKey,
        'X-File-Name': serverFileName
      }
    });
    await waitForRelease(server);
    if (server.isOffline) {
      return NETWORK_FAILURE;
    }
    const bytes = disk.copies.get(fileUri.replace(FAKE_COPY_URI_PREFIX, ''));
    if (bytes === undefined) {
      return NETWORK_FAILURE;
    }
    return answerUpload(server, idempotencyKey, bytes);
  },
  getImportByKey: async (idempotencyKey) => {
    server.requests.push({method: 'GET', path: `/imports/by-key/${idempotencyKey}`, headers: {}});
    if (server.isOffline) {
      return NETWORK_FAILURE;
    }
    const job = findJobByKey(server, idempotencyKey);
    if (!job) {
      return {success: true, payload: null};
    }
    return {success: true, payload: viewJob(job, MOCK_SCENARIO.HAPPY)};
  },
  getImport: async (jobId) => {
    server.requests.push({method: 'GET', path: `/imports/${jobId}`, headers: {}});
    const gate = server.statusReadGates.shift();
    const statusAnswer = readStatus(server, jobId);
    if (gate) {
      await gate;
    }
    return statusAnswer;
  },
  deleteImport: async (jobId, deleteKey) => {
    server.requests.push({
      method: 'DELETE',
      path: `/imports/${jobId}`,
      headers: {'Idempotency-Key': deleteKey}
    });
    if (server.isOffline) {
      return NETWORK_FAILURE;
    }
    const job = server.jobs.get(jobId);
    if (!job) {
      return {success: true, payload: null};
    }
    return answerDelete(server, job, deleteKey);
  }
});
