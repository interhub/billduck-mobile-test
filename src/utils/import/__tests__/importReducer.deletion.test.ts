import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {importReducer} from '@/src/utils/import/importReducer';
import {buildOperationWithJob, buildTestJob, buildTestOperation} from './importFixtures';

describe('importReducer: deletion', () => {
  it('keeps the first delete key for every retry', () => {
    const deleting = importReducer(buildOperationWithJob('ready', IMPORT_STATUS.READY, 3), {
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
    const deleting = buildTestOperation({
      phase: 'deleting',
      jobId: 'job-demo-001',
      revision: 4,
      serverStatus: IMPORT_STATUS.DELETING,
      deleteKey: 'k'
    });
    const still = importReducer(deleting, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.DELETING, 4),
      hasItems: false
    });
    const done = importReducer(still.operation, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.DELETED, 5),
      hasItems: false
    });
    expect(still.operation.phase).toBe('deleting');
    expect(done.operation.phase).toBe('deleted');
  });

  it('stays deleting when a restart refills ready payments before the DELETE is repeated', () => {
    const deleting = buildTestOperation({
      phase: 'deleting',
      jobId: 'job-demo-001',
      revision: 3,
      serverStatus: IMPORT_STATUS.READY,
      deleteKey: 'k'
    });
    const {operation} = importReducer(deleting, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.READY, 3),
      hasItems: false
    });
    expect(operation.phase).toBe('deleting');
  });

  it('never brings the report back once a deletion was asked for, even from a silent server', () => {
    const silent = buildTestOperation({
      phase: 'server_unavailable',
      jobId: 'job-demo-001',
      revision: 3,
      serverStatus: IMPORT_STATUS.READY,
      deleteKey: 'delete-key-0001'
    });
    const answered = importReducer(silent, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.READY, 3),
      hasItems: false
    });
    expect(answered.operation.phase).toBe('delete_failed');
    const stillSilent = importReducer(silent, {
      type: 'job_answer',
      job: buildTestJob(IMPORT_STATUS.READY, 3),
      hasItems: true
    });
    expect(stillSilent.operation.phase).toBe('delete_failed');
  });

  it('deletes a failed import that already has a job, and only such a failed import', () => {
    const failedWithJob = buildTestOperation({
      phase: 'failed',
      jobId: 'job-demo-001',
      revision: 1,
      serverStatus: IMPORT_STATUS.QUEUED,
      failure: {reason: 'server_rejected', httpStatus: 403}
    });
    expect(
      importReducer(failedWithJob, {type: 'delete_requested', deleteKey: 'k'}).operation.phase
    ).toBe('deleting');
    const failedUpload = buildTestOperation({
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus: 415}
    });
    expect(importReducer(failedUpload, {type: 'delete_requested', deleteKey: 'k'}).accepted).toBe(
      false
    );
  });

  it('marks a 404 for the job id as gone on the server, not as deleted', () => {
    const {operation} = importReducer(buildOperationWithJob('ready', IMPORT_STATUS.READY, 3), {
      type: 'gone_on_server'
    });
    expect(operation.phase).toBe('gone_on_server');
  });
});
