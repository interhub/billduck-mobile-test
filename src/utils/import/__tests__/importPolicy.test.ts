import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportOperation} from '@/src/types/importOperation';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {
  isHardRejection,
  keyLookupStatus,
  listReferencedCopies,
  replaceByKey,
  resolveDeletionOutcome,
  resolveUploadEvent
} from '@/src/utils/import/importPolicy';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';

const OPERATION: ImportOperation = {
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
  updatedAt: '2026-10-29T13:32:00.000Z'
};

describe('importPolicy', () => {
  it('repeats no upload after a 4xx, but every other failure stays unknown', () => {
    expect(isHardRejection({kind: ERROR_KIND.VALIDATION, httpStatus: 415})).toBe(true);
    expect(isHardRejection({kind: ERROR_KIND.VALIDATION, httpStatus: null})).toBe(false);
    expect(isHardRejection({kind: ERROR_KIND.SERVER, httpStatus: 503})).toBe(false);
    expect(isHardRejection({kind: ERROR_KIND.NETWORK, httpStatus: null})).toBe(false);
  });

  it('records a found key as 200 and a missing one as 404', () => {
    const job = {
      jobId: 'job-demo-001',
      status: IMPORT_STATUS.QUEUED,
      revision: 1,
      currency: null,
      items: null
    };
    expect(keyLookupStatus(job)).toBe(200);
    expect(keyLookupStatus(null)).toBe(404);
  });

  it('announces a deletion as deleted only when no new statement waits for it', () => {
    expect(resolveDeletionOutcome(false)).toBe('deleted');
    expect(resolveDeletionOutcome(true)).toBeNull();
  });

  it('tells the first POST from a repeat with the same key', () => {
    expect(resolveUploadEvent(null)).toBe(TIMELINE_EVENT.UPLOAD_SENT);
    expect(resolveUploadEvent(2)).toBe(TIMELINE_EVENT.RESENT_SAME_KEY);
  });

  it('replaces only the cleanup entry with the same key', () => {
    const stored = {idempotencyKey: 'key-a', jobId: 'job-demo-001', deleteKey: 'delete-a'};
    const other = {idempotencyKey: 'key-b', jobId: null, deleteKey: null};
    expect(replaceByKey({...stored, jobId: null, deleteKey: null}, stored)).toBe(stored);
    expect(replaceByKey(other, stored)).toBe(other);
  });

  it('keeps only the copy of the stored operation at launch', () => {
    expect(listReferencedCopies(OPERATION)).toEqual(['op-1']);
    expect(listReferencedCopies(null)).toEqual([]);
  });
});
