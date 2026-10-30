import {ImportDraft} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';
import {isReplacingPrevious} from '@/src/utils/import/importPhases';

/**
 * A new statement can be added when nothing is stored, or the stored one is ready or failed,
 * and no new statement waits for the previous one to be deleted.
 */
export const canAddStatement = (
  operation: ImportOperation | null,
  draft: ImportDraft | null
): boolean => {
  if (isReplacingPrevious(draft)) {
    return false;
  }
  return !operation || operation.phase === 'ready' || operation.phase === 'failed';
};
