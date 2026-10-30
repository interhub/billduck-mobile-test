import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
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
import {buildTestJob, buildTestOperation} from './importFixtures';

describe('importPolicy', () => {
  it('repeats no upload after a 4xx, but every other failure stays unknown', () => {
    expect(isHardRejection({kind: ERROR_KIND.VALIDATION, httpStatus: 415})).toBe(true);
    expect(isHardRejection({kind: ERROR_KIND.VALIDATION, httpStatus: null})).toBe(false);
    expect(isHardRejection({kind: ERROR_KIND.SERVER, httpStatus: 503})).toBe(false);
    expect(isHardRejection({kind: ERROR_KIND.NETWORK, httpStatus: null})).toBe(false);
  });

  it('records a found key as 200 and a missing one as 404', () => {
    const job = buildTestJob(IMPORT_STATUS.QUEUED, 1);
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
    expect(listReferencedCopies(buildTestOperation())).toEqual(['op-1']);
    expect(listReferencedCopies(null)).toEqual([]);
  });
});
