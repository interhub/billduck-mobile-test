import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob} from '@/src/types/importApi';
import {buildTestJob} from '@/src/utils/import/__tests__/importFixtures';

/** A new job reads queued this long, as on the kit's mock. */
export const FAKE_QUEUED_MS = 250;
/** Then it reads processing until it is this old, and ready after that. */
export const FAKE_PROCESSING_ENDS_MS = 1_000;
/** A job reads deleting this long after its first DELETE, and deleted after that. */
export const FAKE_DELETING_MS = 1_000;
/** In stale_status this status read of a job answers processing r2 after ready r3. */
const STALE_READ_NUMBER = 2;
/** Job ids are numbered like the mock's: job-demo-001. */
const JOB_NUMBER_DIGITS = 3;

/** The revision the kit's mock gives each status. */
const STATUS_REVISION: Record<IMPORT_STATUS, number> = {
  [IMPORT_STATUS.QUEUED]: 1,
  [IMPORT_STATUS.PROCESSING]: 2,
  [IMPORT_STATUS.READY]: 3,
  [IMPORT_STATUS.DELETING]: 4,
  [IMPORT_STATUS.DELETED]: 5
};

export type FakeJob = {
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

/** The counters of the mock's `/__test/state`. */
type FakeCounters = {
  createRequests: number;
  newJobs: number;
  duplicateHits: number;
  deleteRequests: number;
};

/**
 * The state of the fake mock. Tests flip the switches; the fake API records the requests and
 * changes jobs and counters through the methods below, never by assigning a field.
 */
export type FakeServer = {
  mode: MOCK_SCENARIO;
  /** Every request ends without an answer. */
  isOffline: boolean;
  /** A DELETE is carried out, but its answer never arrives. */
  loseDeleteAnswers: boolean;
  /** Every upload that reaches the server is refused with this status. */
  forcedUploadStatus: number | null;
  /** Every status read is refused with this status. */
  refusedReadStatus: number | null;
  /** Upload answers wait until the test releases them. */
  holdUploads: boolean;
  heldUploads: (() => void)[];
  /** One gate per held status read: the read hands its answer over when its gate opens. */
  statusReadGates: Promise<void>[];
  nextJobNumber: number;
  jobs: Map<string, FakeJob>;
  byKey: Map<string, string>;
  deleteKeys: Map<string, string>;
  /** Status reads per job: stale_status answers by their number. */
  getCounts: Map<string, number>;
  stats: FakeCounters;
  requests: RecordedRequest[];
  count: (counter: keyof FakeCounters) => void;
  /** A new job under its key, numbered like the mock's; it counts nothing. */
  addJob: (key: string, bytes: string) => FakeJob;
  /** The job after a DELETE: it reads deleting from the first DELETE on. */
  markDeleted: (job: FakeJob) => FakeJob;
  setScenario: (mode: MOCK_SCENARIO) => void;
  /** Like `POST /__test/reset`: every job is forgotten and the numbering starts again. */
  reset: () => void;
};

const freshCounters = (): FakeCounters => ({
  createRequests: 0,
  newJobs: 0,
  duplicateHits: 0,
  deleteRequests: 0
});

/** The job in the status given, with the mock's revision for it. */
export const viewAs = (jobId: string, status: IMPORT_STATUS): ImportJob =>
  buildTestJob(status, STATUS_REVISION[status], jobId);

const viewDeletion = (jobId: string, deletedAt: number): ImportJob => {
  if (Date.now() - deletedAt < FAKE_DELETING_MS) {
    return viewAs(jobId, IMPORT_STATUS.DELETING);
  }
  return viewAs(jobId, IMPORT_STATUS.DELETED);
};

const viewByAge = (job: FakeJob): ImportJob => {
  const age = Date.now() - job.createdAt;
  if (age < FAKE_QUEUED_MS) {
    return viewAs(job.jobId, IMPORT_STATUS.QUEUED);
  }
  if (age < FAKE_PROCESSING_ENDS_MS) {
    return viewAs(job.jobId, IMPORT_STATUS.PROCESSING);
  }
  return viewAs(job.jobId, IMPORT_STATUS.READY);
};

/** What the mock says about a job; `readNumber` counts its status reads for stale_status. */
export const viewJob = (job: FakeJob, mode: MOCK_SCENARIO, readNumber = 0): ImportJob => {
  if (job.deletedAt !== null) {
    return viewDeletion(job.jobId, job.deletedAt);
  }
  if (mode !== MOCK_SCENARIO.STALE_STATUS || readNumber === 0) {
    return viewByAge(job);
  }
  if (readNumber === STALE_READ_NUMBER) {
    return viewAs(job.jobId, IMPORT_STATUS.PROCESSING);
  }
  return viewAs(job.jobId, IMPORT_STATUS.READY);
};

export const createFakeServer = (): FakeServer => {
  const server: FakeServer = {
    mode: MOCK_SCENARIO.HAPPY,
    isOffline: false,
    loseDeleteAnswers: false,
    forcedUploadStatus: null,
    refusedReadStatus: null,
    holdUploads: false,
    heldUploads: [],
    statusReadGates: [],
    nextJobNumber: 1,
    jobs: new Map(),
    byKey: new Map(),
    deleteKeys: new Map(),
    getCounts: new Map(),
    stats: freshCounters(),
    requests: [],
    count: (counter) => {
      server.stats[counter] += 1;
    },
    addJob: (key, bytes) => {
      const jobId = `job-demo-${String(server.nextJobNumber).padStart(JOB_NUMBER_DIGITS, '0')}`;
      server.nextJobNumber += 1;
      const job = {jobId, key, bytes, createdAt: Date.now(), deletedAt: null};
      server.jobs.set(jobId, job);
      server.byKey.set(key, jobId);
      return job;
    },
    markDeleted: (job) => {
      const deleted = {...job, deletedAt: job.deletedAt ?? Date.now()};
      server.jobs.set(job.jobId, deleted);
      return deleted;
    },
    setScenario: (mode) => {
      server.mode = mode;
      server.getCounts.clear();
    },
    reset: () => {
      server.mode = MOCK_SCENARIO.HAPPY;
      server.nextJobNumber = 1;
      server.jobs.clear();
      server.byKey.clear();
      server.deleteKeys.clear();
      server.getCounts.clear();
      server.stats = freshCounters();
    }
  };
  return server;
};
