import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob, RecurringItem} from '@/src/types/importApi';
import {ImportOperation, ImportPhase} from '@/src/types/importOperation';

/** The two monthly payments the kit's mock reports for every ready statement. */
export const READY_PAYMENTS: RecurringItem[] = [
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

/** A stored operation right before its first POST; a test overrides only what it is about. */
export const buildTestOperation = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
  operationId: 'op-1',
  idempotencyKey: 'key-0000-0001',
  deleteKey: null,
  phase: 'uploading',
  jobId: null,
  revision: 0,
  serverStatus: null,
  failure: null,
  file: {sizeBytes: 112, format: 'csv'},
  serverFileName: 'statement-20261029-1432.csv',
  createdAt: '2026-10-29T13:32:00.000Z',
  updatedAt: '2026-10-29T13:32:00.000Z',
  ...overrides
});

/** An operation that holds the first job of the mock in this phase, status and revision. */
export const buildOperationWithJob = (
  phase: ImportPhase,
  status: IMPORT_STATUS,
  revision: number
): ImportOperation =>
  buildTestOperation({phase, jobId: 'job-demo-001', serverStatus: status, revision});

/** A job as a server answer describes it; only a ready job carries a currency and payments. */
export const buildTestJob = (
  status: IMPORT_STATUS,
  revision: number,
  jobId = 'job-demo-001'
): ImportJob => {
  if (status === IMPORT_STATUS.READY) {
    return {jobId, status, revision, currency: 'AUD', items: READY_PAYMENTS};
  }
  return {jobId, status, revision, currency: null, items: null};
};
