import {ImportOutcome, ImportOutcomeKind} from '@/src/types/importDraft';

/**
 * Which ending of the last statement Home talks about. A cancelled upload is reported as clean
 * only once its cleanup is done; until then the cleanup line speaks for it.
 */
export const resolveOutcomeNotice = (
  outcome: ImportOutcome | null,
  hasPendingCleanups: boolean
): ImportOutcomeKind | null => {
  if (!outcome) {
    return null;
  }
  if (outcome.kind === 'upload_cancelled' && hasPendingCleanups) {
    return null;
  }
  return outcome.kind;
};
