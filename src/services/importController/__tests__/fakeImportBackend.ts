import {ImportsApi} from '@/src/api/importsApi/importsApi';
import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ApiResult, ImportJob} from '@/src/types/importApi';
import {StatementFileStore} from '@/src/types/statementFiles';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

export type FakeScenario = 'happy' | 'lost_ack' | 'stale_status' | 'delete_failure';

type FakeJob = {
  jobId: string;
  key: string;
  bytes: string;
  createdAt: number;
  deletedAt: number | null;
};

export type RecordedRequest = {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  headers: Record<string, string>;
};

type QueuedPick =
  | {kind: 'file'; name: string; mimeType: string | null; content: string; reportedSize?: number}
  | {kind: 'cancel'}
  | {kind: 'unreadable'};

const NETWORK_FAILURE = {
  success: false,
  error: {kind: ERROR_KIND.NETWORK, httpStatus: null}
} as const;

const READY_ITEMS = [
  {
    id: 'rec-001',
    merchant: 'StreamBeam',
    amountMinor: 1999,
    cadence: 'monthly',
    lastSeen: '2026-10-01'
  },
  {
    id: 'rec-002',
    merchant: 'BrightGrid',
    amountMinor: 13200,
    cadence: 'monthly',
    lastSeen: '2026-10-03'
  }
];

const failure = <T>(kind: ERROR_KIND, httpStatus: number | null): ApiResult<T> => ({
  success: false,
  error: {kind, httpStatus}
});

const detectFormat = (bytes: string): boolean => {
  return (
    bytes.startsWith('%PDF-') ||
    bytes.slice(0, 24).replace(/\r/g, '').startsWith('date,description,amount\n')
  );
};

/**
 * An in-memory server with the rules of the kit's mock (scenarios, revisions, keys, counters)
 * plus switches the mock lacks: offline, a held upload answer, a lost delete answer, a forced
 * upload status and a refused status read. Unit tests drive it under Jest fake timers; the
 * integration tests use the real mock.
 */
export const createFakeImportBackend = () => {
  const copies = new Map<string, string>();
  const picks: QueuedPick[] = [];
  const server = {
    mode: 'happy' as FakeScenario,
    isOffline: false,
    loseDeleteAnswers: false,
    forcedUploadStatus: null as number | null,
    refusedReadStatus: null as number | null,
    holdUploads: false,
    heldUploads: [] as (() => void)[],
    nextJobId: 1,
    jobs: new Map<string, FakeJob>(),
    byKey: new Map<string, string>(),
    deleteKeys: new Map<string, string>(),
    getCounts: new Map<string, number>(),
    stats: {createRequests: 0, newJobs: 0, duplicateHits: 0, deleteRequests: 0},
    requests: [] as RecordedRequest[],
    readFileCalls: 0
  };

  const readyView = (jobId: string): ImportJob => ({
    jobId,
    status: IMPORT_STATUS.READY,
    revision: 3,
    currency: 'AUD',
    items: READY_ITEMS
  });

  const jobView = (job: FakeJob, mode: FakeScenario, getCount = 0): ImportJob => {
    const plain = {jobId: job.jobId, currency: null, items: null};
    if (job.deletedAt !== null) {
      const isDone = Date.now() - job.deletedAt >= 1000;
      return {
        ...plain,
        status: isDone ? IMPORT_STATUS.DELETED : IMPORT_STATUS.DELETING,
        revision: isDone ? 5 : 4
      };
    }
    if (mode === 'stale_status' && getCount > 0) {
      if (getCount === 2) {
        return {...plain, status: IMPORT_STATUS.PROCESSING, revision: 2};
      }
      return readyView(job.jobId);
    }
    const elapsed = Date.now() - job.createdAt;
    if (elapsed < 250) {
      return {...plain, status: IMPORT_STATUS.QUEUED, revision: 1};
    }
    if (elapsed < 1000) {
      return {...plain, status: IMPORT_STATUS.PROCESSING, revision: 2};
    }
    return readyView(job.jobId);
  };

  const waitForRelease = async () => {
    if (!server.holdUploads) {
      return;
    }
    await new Promise<void>((resolve) => {
      server.heldUploads.push(resolve);
    });
  };

  const api: ImportsApi = {
    createImport: async (request) => {
      server.requests.push({
        method: 'POST',
        path: '/imports',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Idempotency-Key': request.idempotencyKey,
          'X-File-Name': request.serverFileName
        }
      });
      await waitForRelease();
      if (server.isOffline) {
        return NETWORK_FAILURE;
      }
      server.readFileCalls += 1;
      const bytes = copies.get(request.fileUri.replace('fake://imports/', ''));
      if (bytes === undefined) {
        return NETWORK_FAILURE;
      }
      server.stats.createRequests += 1;
      if (server.forcedUploadStatus !== null) {
        return failure(ERROR_KIND.VALIDATION, server.forcedUploadStatus);
      }
      if (!detectFormat(bytes)) {
        return failure(ERROR_KIND.VALIDATION, 415);
      }
      const existingId = server.byKey.get(request.idempotencyKey);
      const existing = existingId ? server.jobs.get(existingId) : undefined;
      if (existing) {
        if (existing.bytes !== bytes) {
          return failure(ERROR_KIND.VALIDATION, 409);
        }
        server.stats.duplicateHits += 1;
        return {
          success: true,
          payload: {
            jobId: existing.jobId,
            status: IMPORT_STATUS.QUEUED,
            revision: 1,
            currency: null,
            items: null
          }
        };
      }
      const jobId = `job-demo-${String(server.nextJobId).padStart(3, '0')}`;
      server.nextJobId += 1;
      server.jobs.set(jobId, {
        jobId,
        key: request.idempotencyKey,
        bytes,
        createdAt: Date.now(),
        deletedAt: null
      });
      server.byKey.set(request.idempotencyKey, jobId);
      server.stats.newJobs += 1;
      if (server.mode === 'lost_ack') {
        return NETWORK_FAILURE;
      }
      return {
        success: true,
        payload: {jobId, status: IMPORT_STATUS.QUEUED, revision: 1, currency: null, items: null}
      };
    },
    getImportByKey: async (idempotencyKey) => {
      server.requests.push({method: 'GET', path: `/imports/by-key/${idempotencyKey}`, headers: {}});
      if (server.isOffline) {
        return NETWORK_FAILURE;
      }
      const jobId = server.byKey.get(idempotencyKey);
      const job = jobId ? server.jobs.get(jobId) : undefined;
      return {success: true, payload: job ? jobView(job, 'happy') : null};
    },
    getImport: async (jobId) => {
      server.requests.push({method: 'GET', path: `/imports/${jobId}`, headers: {}});
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
      const count = (server.getCounts.get(jobId) ?? 0) + 1;
      server.getCounts.set(jobId, count);
      return {success: true, payload: jobView(job, server.mode, count)};
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
      server.stats.deleteRequests += 1;
      if (server.mode === 'delete_failure') {
        return failure(ERROR_KIND.SERVER, 503);
      }
      const owner = server.deleteKeys.get(deleteKey);
      if (owner && owner !== jobId) {
        return failure(ERROR_KIND.VALIDATION, 409);
      }
      server.deleteKeys.set(deleteKey, jobId);
      job.deletedAt = job.deletedAt ?? Date.now();
      if (server.loseDeleteAnswers) {
        return NETWORK_FAILURE;
      }
      return {success: true, payload: jobView(job, 'happy')};
    }
  };

  const files: StatementFileStore = {
    pickStatement: async (operationId) => {
      const next = picks.shift();
      if (!next || next.kind === 'unreadable') {
        return failure(ERROR_KIND.UNKNOWN, null);
      }
      if (next.kind === 'cancel') {
        return {success: true, payload: null};
      }
      copies.set(operationId, next.content);
      return {
        success: true,
        payload: {
          originalName: next.name,
          mimeType: next.mimeType,
          reportedSizeBytes: next.reportedSize ?? next.content.length
        }
      };
    },
    readCopySize: (operationId) => copies.get(operationId)?.length ?? null,
    readCopyHeader: (operationId, length) => {
      const content = copies.get(operationId);
      return content === undefined
        ? null
        : Uint8Array.from(content.slice(0, length), (char) => char.charCodeAt(0));
    },
    hasCopy: (operationId) => copies.has(operationId),
    getCopyUri: (operationId) => `fake://imports/${operationId}`,
    removeCopy: (operationId) => {
      copies.delete(operationId);
    },
    removeAllExcept: (operationIds) => {
      for (const operationId of [...copies.keys()]) {
        if (!operationIds.includes(operationId)) {
          copies.delete(operationId);
        }
      }
    }
  };

  return {
    api,
    files,
    server,
    copies,
    queuePick: (pick: QueuedPick) => {
      picks.push(pick);
    },
    setScenario: (mode: FakeScenario) => {
      server.mode = mode;
      server.getCounts.clear();
    },
    /** Like `POST /__test/reset`: every job is forgotten and the numbering starts again. */
    reset: () => {
      server.mode = 'happy';
      server.nextJobId = 1;
      server.jobs.clear();
      server.byKey.clear();
      server.deleteKeys.clear();
      server.getCounts.clear();
      server.stats = {createRequests: 0, newJobs: 0, duplicateHits: 0, deleteRequests: 0};
    },
    /** Another client's upload: after a reset it takes the number our stored job had. */
    addStrangerJob: (): FakeJob => {
      const jobId = `job-demo-${String(server.nextJobId).padStart(3, '0')}`;
      server.nextJobId += 1;
      const strangerJob: FakeJob = {
        jobId,
        key: 'stranger-key-0001',
        bytes: 'date,description,amount\n',
        createdAt: Date.now(),
        deletedAt: null
      };
      server.jobs.set(jobId, strangerJob);
      server.byKey.set(strangerJob.key, jobId);
      return strangerJob;
    },
    releaseUploads: () => {
      const held = server.heldUploads.splice(0);
      for (const release of held) {
        release();
      }
    }
  };
};

export type FakeImportBackend = ReturnType<typeof createFakeImportBackend>;

export const CSV_STATEMENT =
  'date,description,amount\n2026-09-01,StreamBeam,-19.99\n2026-10-01,StreamBeam,-19.99\n2026-10-03,BrightGrid,-132.00\n';
export const PDF_STATEMENT = '%PDF-1.3\n%synthetic statement\n';
export const SPOOFED_PDF =
  'This is plain text, not a PDF. The extension and supplied MIME type are misleading.\n';
