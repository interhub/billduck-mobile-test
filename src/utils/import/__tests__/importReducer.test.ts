import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob} from '@/src/types/importApi';
import {ImportOperation} from '@/src/types/importOperation';
import {importReducer} from '@/src/utils/import/importReducer';
import {JOB_ANSWER_VERDICT} from '@/src/utils/import/revisionGuard';

const buildOperation = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
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

const buildJob = (status: IMPORT_STATUS, revision: number, jobId = 'job-demo-001'): ImportJob => ({
  jobId,
  status,
  revision,
  currency: status === IMPORT_STATUS.READY ? 'AUD' : null,
  items: null
});

const withJob = (phase: ImportOperation['phase'], status: IMPORT_STATUS, revision: number) =>
  buildOperation({phase, jobId: 'job-demo-001', serverStatus: status, revision});

describe('importReducer: upload', () => {
  it('turns a 202 into queued r1 and keeps the job id', () => {
    const {operation, accepted} = importReducer(buildOperation(), {
      type: 'upload_accepted',
      job: buildJob(IMPORT_STATUS.QUEUED, 1)
    });
    expect(accepted).toBe(true);
    expect(operation).toMatchObject({phase: 'queued', jobId: 'job-demo-001', revision: 1});
  });

  it('never treats the 202 as a ready report', () => {
    const {operation} = importReducer(buildOperation(), {
      type: 'upload_accepted',
      job: buildJob(IMPORT_STATUS.QUEUED, 1)
    });
    expect(operation.phase).not.toBe('ready');
  });

  it('moves a lost answer to reconnecting and then to server_unavailable', () => {
    const lost = importReducer(buildOperation(), {type: 'upload_outcome_unknown'}).operation;
    expect(lost.phase).toBe('reconnecting');
    expect(importReducer(lost, {type: 'recovery_exhausted'}).operation.phase).toBe(
      'server_unavailable'
    );
  });

  it('accepts the job found by key while reconnecting', () => {
    const reconnecting = buildOperation({phase: 'reconnecting'});
    const {operation} = importReducer(reconnecting, {
      type: 'upload_accepted',
      job: buildJob(IMPORT_STATUS.PROCESSING, 2)
    });
    expect(operation).toMatchObject({phase: 'processing', jobId: 'job-demo-001', revision: 2});
  });

  it('turns a 4xx into failed without a retry path', () => {
    const {operation} = importReducer(buildOperation(), {type: 'upload_rejected', httpStatus: 415});
    expect(operation.phase).toBe('failed');
    expect(operation.failure).toEqual({reason: 'server_rejected', httpStatus: 415});
    expect(importReducer(operation, {type: 'recovery_started'}).accepted).toBe(false);
  });

  it('allows "Send again" only from not_received', () => {
    const notReceived = importReducer(buildOperation({phase: 'reconnecting'}), {
      type: 'not_received'
    }).operation;
    expect(notReceived.phase).toBe('not_received');
    expect(importReducer(notReceived, {type: 'resend_requested'}).operation.phase).toBe(
      'uploading'
    );
    expect(
      importReducer(buildOperation({phase: 'reconnecting'}), {type: 'resend_requested'}).accepted
    ).toBe(false);
  });

  it('marks a lost private copy as failed while the outcome is unknown', () => {
    const {operation} = importReducer(buildOperation({phase: 'not_received'}), {
      type: 'file_missing'
    });
    expect(operation).toMatchObject({phase: 'failed', failure: {reason: 'file_missing'}});
  });
});

describe('importReducer: job answers', () => {
  it('moves queued to processing to ready', () => {
    const processing = importReducer(withJob('queued', IMPORT_STATUS.QUEUED, 1), {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.PROCESSING, 2),
      hasItems: false
    }).operation;
    const ready = importReducer(processing, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.READY, 3),
      hasItems: false
    });
    expect(processing.phase).toBe('processing');
    expect(ready.operation).toMatchObject({
      phase: 'ready',
      revision: 3,
      serverStatus: IMPORT_STATUS.READY
    });
  });

  it('does not roll back from ready r3 to processing r2', () => {
    const ready = withJob('ready', IMPORT_STATUS.READY, 3);
    const {operation, verdict, accepted} = importReducer(ready, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.PROCESSING, 2),
      hasItems: true
    });
    expect(accepted).toBe(true);
    expect(verdict).toBe(JOB_ANSWER_VERDICT.STALE);
    expect(operation).toEqual(ready);
  });

  it('ignores an answer about another job', () => {
    const queued = withJob('queued', IMPORT_STATUS.QUEUED, 1);
    const {accepted, operation} = importReducer(queued, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.READY, 3, 'job-demo-002'),
      hasItems: false
    });
    expect(accepted).toBe(false);
    expect(operation).toEqual(queued);
  });

  it('ignores a late upload answer once the job is known', () => {
    const processing = withJob('processing', IMPORT_STATUS.PROCESSING, 2);
    expect(
      importReducer(processing, {type: 'upload_accepted', job: buildJob(IMPORT_STATUS.QUEUED, 1)})
        .accepted
    ).toBe(false);
  });

  it('returns a job that lost its connection to its last status when the server answers again', () => {
    const offline = withJob('server_unavailable', IMPORT_STATUS.PROCESSING, 2);
    const {operation} = importReducer(offline, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.PROCESSING, 2),
      hasItems: false
    });
    expect(operation.phase).toBe('processing');
  });
});

describe('importReducer: deletion', () => {
  it('keeps the first delete key for every retry', () => {
    const deleting = importReducer(withJob('ready', IMPORT_STATUS.READY, 3), {
      type: 'delete_requested',
      deleteKey: 'delete-key-1'
    }).operation;
    const failed = importReducer(deleting, {type: 'delete_failed'}).operation;
    const retried = importReducer(failed, {
      type: 'delete_requested',
      deleteKey: 'delete-key-2'
    }).operation;
    expect(failed.phase).toBe('delete_failed');
    expect(retried).toMatchObject({phase: 'deleting', deleteKey: 'delete-key-1'});
  });

  it('says deleted only after the server answers deleted', () => {
    const deleting = buildOperation({
      phase: 'deleting',
      jobId: 'job-demo-001',
      revision: 4,
      serverStatus: IMPORT_STATUS.DELETING,
      deleteKey: 'k'
    });
    const still = importReducer(deleting, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.DELETING, 4),
      hasItems: false
    });
    const done = importReducer(still.operation, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.DELETED, 5),
      hasItems: false
    });
    expect(still.operation.phase).toBe('deleting');
    expect(done.operation.phase).toBe('deleted');
  });

  it('stays deleting when a restart refills ready payments before the DELETE is repeated', () => {
    const deleting = buildOperation({
      phase: 'deleting',
      jobId: 'job-demo-001',
      revision: 3,
      serverStatus: IMPORT_STATUS.READY,
      deleteKey: 'k'
    });
    const {operation} = importReducer(deleting, {
      type: 'job_answer',
      job: buildJob(IMPORT_STATUS.READY, 3),
      hasItems: false
    });
    expect(operation.phase).toBe('deleting');
  });

  it('marks a 404 for the job id as gone on the server, not as deleted', () => {
    const {operation} = importReducer(withJob('ready', IMPORT_STATUS.READY, 3), {
      type: 'gone_on_server'
    });
    expect(operation.phase).toBe('gone_on_server');
  });
});

describe('importReducer: refused status reads', () => {
  it('stops a queued job as failed on a 4xx status read', () => {
    const {operation} = importReducer(withJob('queued', IMPORT_STATUS.QUEUED, 1), {
      type: 'job_rejected',
      httpStatus: 400
    });
    expect(operation).toMatchObject({
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus: 400}
    });
  });

  it('turns a refused read during deletion into delete_failed, never into deleted', () => {
    const deleting = buildOperation({
      phase: 'deleting',
      jobId: 'job-demo-001',
      revision: 4,
      serverStatus: IMPORT_STATUS.DELETING,
      deleteKey: 'k'
    });
    expect(importReducer(deleting, {type: 'job_rejected', httpStatus: 400}).operation.phase).toBe(
      'delete_failed'
    );
  });

  it('ignores a refused read on a ready job', () => {
    expect(
      importReducer(withJob('ready', IMPORT_STATUS.READY, 3), {
        type: 'job_rejected',
        httpStatus: 400
      }).accepted
    ).toBe(false);
  });
});

describe('importReducer: binding to the operation', () => {
  it('drops every answer once the operation has no job to bind it to', () => {
    const failed = buildOperation({
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus: 415}
    });
    expect(
      importReducer(failed, {
        type: 'job_answer',
        job: buildJob(IMPORT_STATUS.READY, 3),
        hasItems: false
      }).accepted
    ).toBe(false);
    expect(
      importReducer(failed, {type: 'upload_accepted', job: buildJob(IMPORT_STATUS.QUEUED, 1)})
        .accepted
    ).toBe(false);
  });

  it('never moves a deleted job back, whatever arrives late', () => {
    const deleted = buildOperation({
      phase: 'deleted',
      jobId: 'job-demo-001',
      revision: 5,
      serverStatus: IMPORT_STATUS.DELETED
    });
    expect(
      importReducer(deleted, {
        type: 'job_answer',
        job: buildJob(IMPORT_STATUS.READY, 3),
        hasItems: false
      }).accepted
    ).toBe(false);
  });
});
