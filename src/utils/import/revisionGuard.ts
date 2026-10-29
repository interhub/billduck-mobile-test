import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ImportJob} from '@/src/types/importApi';

export enum JOB_ANSWER_VERDICT {
  /** Newer than what the phone holds: the answer moves the operation. */
  APPLY = 'apply',
  /** The revision the phone already holds: nothing changes. */
  SAME = 'same',
  /** Older than what the phone holds: skipped, so the screen never rolls back. */
  STALE = 'stale'
}

type HeldRevision = {
  revision: number;
  /** Whether the phone already shows the payments of a ready job. */
  hasItems: boolean;
};

/**
 * A server answer is applied only when its revision is higher than the one the phone holds.
 * The single exception is `ready` with the same revision while the phone has no payments yet:
 * after a restart the payments are not stored, so they are taken from that answer.
 */
export const judgeJobAnswer = (
  held: HeldRevision,
  answer: Pick<ImportJob, 'status' | 'revision'>
): JOB_ANSWER_VERDICT => {
  if (answer.revision > held.revision) {
    return JOB_ANSWER_VERDICT.APPLY;
  }
  if (answer.revision < held.revision) {
    return JOB_ANSWER_VERDICT.STALE;
  }
  if (answer.status === IMPORT_STATUS.READY && !held.hasItems) {
    return JOB_ANSWER_VERDICT.APPLY;
  }
  return JOB_ANSWER_VERDICT.SAME;
};
