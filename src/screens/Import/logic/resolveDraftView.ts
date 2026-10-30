import {ConfirmedDraft, ImportDraft} from '@/src/types/importDraft';
import {StatementFormat} from '@/src/types/importOperation';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';

/** What the confirm screen shows for the picked file. */
export type DraftView =
  | {kind: 'checking'}
  | {kind: 'rejected'; rejection: STATEMENT_REJECTION; sizeBytes: number}
  | {kind: 'checked'; draft: ConfirmedDraft; format: StatementFormat};

/** A file that is still being read shows the check: the screen never guesses its format. */
export const resolveDraftView = (draft: ImportDraft | null): DraftView => {
  if (!draft || draft.phase === 'validating') {
    return {kind: 'checking'};
  }
  if (draft.phase === 'rejected') {
    return {kind: 'rejected', rejection: draft.rejection, sizeBytes: draft.sizeBytes};
  }
  return {kind: 'checked', draft, format: draft.format};
};
