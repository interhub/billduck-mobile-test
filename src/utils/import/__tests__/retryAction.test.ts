import {ConfirmedDraft} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';
import {resolveRetryPlan, RETRY_ACTION} from '@/src/utils/import/retryAction';

const buildOperation = (overrides: Partial<ImportOperation> = {}): ImportOperation => ({
  operationId: 'op-1',
  idempotencyKey: 'key-0000-0001',
  deleteKey: null,
  phase: 'server_unavailable',
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
      operation: buildOperation({phase: 'delete_failed', jobId: 'job-demo-001'}),
      launchMemory: memory()
    });
    expect(plan).toEqual({action: RETRY_ACTION.REPLACE, draft: BLOCKED_DRAFT});
  });

  it('sends the same DELETE again after a failed deletion', () => {
    const operation = buildOperation({phase: 'delete_failed', jobId: 'job-demo-001'});
    expect(resolveRetryPlan({draft: null, operation, launchMemory: memory()})).toEqual({
      action: RETRY_ACTION.DELETE,
      operationId: 'op-1'
    });
  });

  it('reads a silent job again once its key was checked in this launch, else checks the key', () => {
    const operation = buildOperation({jobId: 'job-demo-001'});
    expect(actionFor(operation, memory([], ['op-1']))).toBe(RETRY_ACTION.READ_JOB);
    expect(actionFor(operation)).toBe(RETRY_ACTION.VERIFY_JOB);
  });

  it('recovers an upload of this launch, and only looks one of an earlier launch up', () => {
    expect(actionFor(buildOperation(), memory(['op-1']))).toBe(RETRY_ACTION.RECOVER);
    expect(actionFor(buildOperation())).toBe(RETRY_ACTION.CHECK_UPLOAD);
  });

  it('does nothing while nothing waits for "Retry"', () => {
    expect(actionFor(null)).toBeNull();
    expect(actionFor(buildOperation({phase: 'ready', jobId: 'job-demo-001'}))).toBeNull();
    expect(
      resolveRetryPlan({
        draft: {...BLOCKED_DRAFT, isReplacementBlocked: false},
        operation: null,
        launchMemory: memory()
      })
    ).toBeNull();
  });
});
