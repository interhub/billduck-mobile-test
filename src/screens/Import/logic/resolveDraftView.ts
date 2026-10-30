import {ImportDraft} from '@/src/types/importDraft';
import {StatementFormat} from '@/src/types/importOperation';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';

/** What the confirm screen shows for the picked file. */
export type DraftView =
  | {kind: 'checking'}
  | {kind: 'rejected'; rejection: STATEMENT_REJECTION; sizeBytes: number}
  | {kind: 'checked'; draft: ImportDraft; format: StatementFormat};

/** A file whose format is not known yet is still being checked: the screen never guesses one. */
export const resolveDraftView = (draft: ImportDraft | null): DraftView => {
  if (!draft || draft.phase === 'validating') {
    return {kind: 'checking'};
  }
  if (draft.phase === 'rejected' && draft.rejection) {
    return {kind: 'rejected', rejection: draft.rejection, sizeBytes: draft.sizeBytes};
  }
  if (!draft.format) {
    return {kind: 'checking'};
  }
  return {kind: 'checked', draft, format: draft.format};
};
