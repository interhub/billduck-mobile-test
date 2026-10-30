import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {importReducer} from '@/src/utils/import/importReducer';
import {JOB_ANSWER_VERDICT} from '@/src/utils/import/revisionGuard';
import {buildOperationWithJob, buildTestJob, buildTestOperation} from './importFixtures';

describe('importReducer: job answers', () => {
  it('moves queued to processing to ready', () => {
    const processing = importReducer(buildOperationWithJob('queued', IMPORT_STATUS.QUEUED, 1), {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.PROCESSING, 2),
      hasItems: false
    }).operation;
    const ready = importReducer(processing, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.READY, 3),
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
    const ready = buildOperationWithJob('ready', IMPORT_STATUS.READY, 3);
    const {operation, verdict, accepted} = importReducer(ready, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.PROCESSING, 2),
      hasItems: true
    });
    expect(accepted).toBe(true);
    expect(verdict).toBe(JOB_ANSWER_VERDICT.STALE);
    expect(operation).toEqual(ready);
  });

  it('ignores an answer about another job', () => {
    const queued = buildOperationWithJob('queued', IMPORT_STATUS.QUEUED, 1);
    const {accepted, operation} = importReducer(queued, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.READY, 3, 'job-demo-002'),
      hasItems: false
    });
    expect(accepted).toBe(false);
    expect(operation).toEqual(queued);
  });

  it('ignores a late upload answer once the job is known', () => {
    const processing = buildOperationWithJob('processing', IMPORT_STATUS.PROCESSING, 2);
    expect(
      importReducer(processing, {
        type: 'upload_accepted',
        job: buildTestJob(IMPORT_STATUS.QUEUED, 1)
      }).accepted
    ).toBe(false);
  });

  it('returns a job that lost its connection to its last status when the server answers again', () => {
    const offline = buildOperationWithJob('server_unavailable', IMPORT_STATUS.PROCESSING, 2);
    const {operation} = importReducer(offline, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.PROCESSING, 2),
      hasItems: false
    });
    expect(operation.phase).toBe('processing');
  });
});

describe('importReducer: refused status reads', () => {
  it('stops a queued job as failed on a 4xx status read', () => {
    const {operation} = importReducer(buildOperationWithJob('queued', IMPORT_STATUS.QUEUED, 1), {
      type: 'job_rejected',
      httpStatus: 400
    });
    expect(operation).toMatchObject({
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus: 400}
    });
  });

  it('turns a refused read during deletion into delete_failed, never into deleted', () => {
    const deleting = buildTestOperation({
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
      importReducer(buildOperationWithJob('ready', IMPORT_STATUS.READY, 3), {
        type: 'job_rejected',
        httpStatus: 400
      }).accepted
    ).toBe(false);
  });
});

describe('importReducer: binding to the operation', () => {
  it('drops every answer once the operation has no job to bind it to', () => {
    const failed = buildTestOperation({
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus: 415}
    });
    expect(
      importReducer(failed, {
        type: 'job_answer',
        job: buildTestJob(IMPORT_STATUS.READY, 3),
        hasItems: false
      }).accepted
    ).toBe(false);
    expect(
      importReducer(failed, {type: 'upload_accepted', job: buildTestJob(IMPORT_STATUS.QUEUED, 1)})
        .accepted
    ).toBe(false);
  });

  it('never moves a deleted job back, whatever arrives late', () => {
    const deleted = buildTestOperation({
      phase: 'deleted',
      jobId: 'job-demo-001',
      revision: 5,
      serverStatus: IMPORT_STATUS.DELETED
    });
    expect(
      importReducer(deleted, {
        type: 'job_answer',
        job: buildTestJob(IMPORT_STATUS.READY, 3),
        hasItems: false
      }).accepted
    ).toBe(false);
  });
});
