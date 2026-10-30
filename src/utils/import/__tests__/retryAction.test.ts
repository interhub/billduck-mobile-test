import {ConfirmedDraft} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';
import {resolveRetryPlan, RETRY_ACTION} from '@/src/utils/import/retryAction';
import {buildTestOperation} from './importFixtures';

const BLOCKED_DRAFT: ConfirmedDraft = {
  operationId: 'op-2',
  phase: 'replacing_previous',
  originalName: 'statement.csv',
  sizeBytes: 112,
  format: 'csv',
  rejection: null,
  idempotencyKey: 'key-0000-0002',
  serverFileName: 'statement-20261029-1440.csv',
  createdAt: '2026-10-29T13:40:00.000Z',
  isReplacementBlocked: true
};

const memory = (sent: string[] = [], verified: string[] = []) => ({
  sentUploads: new Set(sent),
  verifiedJobs: new Set(verified)
});

const actionFor = (operation: ImportOperation | null, launchMemory = memory()) =>
  resolveRetryPlan({draft: null, operation, launchMemory})?.action ?? null;

describe('resolveRetryPlan', () => {
  it('replaces the previous statement first when its deletion was blocked', () => {
    const plan = resolveRetryPlan({
      draft: BLOCKED_DRAFT,
      operation: buildTestOperation({phase: 'delete_failed', jobId: 'job-demo-001'}),
      launchMemory: memory()
    });
    expect(plan).toEqual({action: RETRY_ACTION.REPLACE, draft: BLOCKED_DRAFT});
  });

  it('sends the same DELETE again after a failed deletion', () => {
    const operation = buildTestOperation({phase: 'delete_failed', jobId: 'job-demo-001'});
    expect(resolveRetryPlan({draft: null, operation, launchMemory: memory()})).toEqual({
      action: RETRY_ACTION.DELETE,
      operationId: 'op-1'
    });
  });

  it('reads a silent job again once its key was checked in this launch, else checks the key', () => {
    const operation = buildTestOperation({phase: 'server_unavailable', jobId: 'job-demo-001'});
    expect(actionFor(operation, memory([], ['op-1']))).toBe(RETRY_ACTION.READ_JOB);
    expect(actionFor(operation)).toBe(RETRY_ACTION.VERIFY_JOB);
  });

  it('recovers an upload of this launch, and only looks one of an earlier launch up', () => {
    const silentUpload = buildTestOperation({phase: 'server_unavailable'});
    expect(actionFor(silentUpload, memory(['op-1']))).toBe(RETRY_ACTION.RECOVER);
    expect(actionFor(silentUpload)).toBe(RETRY_ACTION.CHECK_UPLOAD);
  });

  it('does nothing while nothing waits for "Retry"', () => {
    expect(actionFor(null)).toBeNull();
    expect(actionFor(buildTestOperation({phase: 'ready', jobId: 'job-demo-001'}))).toBeNull();
    expect(
      resolveRetryPlan({
        draft: {...BLOCKED_DRAFT, isReplacementBlocked: false},
        operation: null,
        launchMemory: memory()
      })
    ).toBeNull();
  });
});
