import {ImportDraft} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';
import {isReplacingPrevious} from '@/src/utils/import/importPhases';

/** Home shows its empty state while no statement is stored and none waits to replace one. */
export const isHomeEmpty = (
  operation: ImportOperation | null,
  draft: ImportDraft | null
): boolean => {
  return !operation && !isReplacingPrevious(draft);
};
