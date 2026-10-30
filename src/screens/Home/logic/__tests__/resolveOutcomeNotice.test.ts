import {resolveOutcomeNotice} from '@/src/screens/Home/logic/resolveOutcomeNotice';
import {ImportOutcome, ImportOutcomeKind} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';

const operation: ImportOperation = {
  operationId: 'op-1',
  idempotencyKey: 'key-0000-0001',
  deleteKey: null,
  phase: 'deleted',
  jobId: 'job-demo-001',
  revision: 3,
  serverStatus: null,
  failure: null,
  file: {sizeBytes: 2458, format: 'pdf'},
  serverFileName: 'statement-20261029-1432.pdf',
  createdAt: '2026-10-29T13:32:00.000Z',
  updatedAt: '2026-10-29T13:32:00.000Z'
};

const outcomeOf = (kind: ImportOutcomeKind): ImportOutcome => ({
  kind,
  operation,
  at: '2026-10-30T09:05:01.000Z'
});

describe('resolveOutcomeNotice', () => {
  it('says nothing when no statement ended', () => {
    expect(resolveOutcomeNotice(null, false)).toBeNull();
  });

  it.each(['deleted', 'gone_on_server'] as const)(
    'reports the %s ending even while a cleanup is pending',
    (kind) => {
      expect(resolveOutcomeNotice(outcomeOf(kind), true)).toBe(kind);
    }
  );

  it('reports a cancelled upload as clean only once its cleanup is done', () => {
    expect(resolveOutcomeNotice(outcomeOf('upload_cancelled'), true)).toBeNull();
    expect(resolveOutcomeNotice(outcomeOf('upload_cancelled'), false)).toBe('upload_cancelled');
  });
});
