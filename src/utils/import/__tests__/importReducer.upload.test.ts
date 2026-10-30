import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {importReducer} from '@/src/utils/import/importReducer';
import {buildTestJob, buildTestOperation} from './importFixtures';

describe('importReducer: upload', () => {
  it('turns a 202 into queued r1 and keeps the job id', () => {
    const {operation, accepted} = importReducer(buildTestOperation(), {
      type: 'upload_accepted',
      job: buildTestJob(IMPORT_STATUS.QUEUED, 1)
    });
    expect(accepted).toBe(true);
    expect(operation).toMatchObject({phase: 'queued', jobId: 'job-demo-001', revision: 1});
  });

  it('never treats the 202 as a ready report', () => {
    const {operation} = importReducer(buildTestOperation(), {
      type: 'upload_accepted',
      job: buildTestJob(IMPORT_STATUS.QUEUED, 1)
    });
    expect(operation.phase).not.toBe('ready');
  });

  it('moves a lost answer to reconnecting and then to server_unavailable', () => {
    const lost = importReducer(buildTestOperation(), {type: 'upload_outcome_unknown'}).operation;
    expect(lost.phase).toBe('reconnecting');
    expect(importReducer(lost, {type: 'recovery_exhausted'}).operation.phase).toBe(
      'server_unavailable'
    );
  });

  it('accepts the job found by key while reconnecting', () => {
    const reconnecting = buildTestOperation({phase: 'reconnecting'});
    const {operation} = importReducer(reconnecting, {
      type: 'upload_accepted',
      job: buildTestJob(IMPORT_STATUS.PROCESSING, 2)
    });
    expect(operation).toMatchObject({phase: 'processing', jobId: 'job-demo-001', revision: 2});
  });

  it('turns a 4xx into failed without a retry path', () => {
    const {operation} = importReducer(buildTestOperation(), {
      type: 'upload_rejected',
      httpStatus: 415
    });
    expect(operation.phase).toBe('failed');
    expect(operation.failure).toEqual({reason: 'server_rejected', httpStatus: 415});
    expect(importReducer(operation, {type: 'recovery_started'}).accepted).toBe(false);
  });

  it('allows "Send again" only from not_received', () => {
    const notReceived = importReducer(buildTestOperation({phase: 'reconnecting'}), {
      type: 'not_received'
    }).operation;
    expect(notReceived.phase).toBe('not_received');
    expect(importReducer(notReceived, {type: 'resend_requested'}).operation.phase).toBe(
      'uploading'
    );
    expect(
      importReducer(buildTestOperation({phase: 'reconnecting'}), {type: 'resend_requested'})
        .accepted
    ).toBe(false);
  });

  it('marks a lost private copy as failed while the outcome is unknown', () => {
    const {operation} = importReducer(buildTestOperation({phase: 'not_received'}), {
      type: 'file_missing'
    });
    expect(operation).toMatchObject({phase: 'failed', failure: {reason: 'file_missing'}});
  });
});
