import {useShallow} from 'zustand/react/shallow';
import {BadgePhase, toBadgePhase} from '@/src/components/ui/StatusBadge';
import {ImportDraft, ImportOutcome, useImportStore} from '@/src/stores/importStore';
import {ImportOperation, StatementFile} from '@/src/types/importOperation';

/** What the import screens talk about: the statement in the works, or how the last one ended. */
export type ImportSubject = {
  phase: BadgePhase | null;
  /** Source of the on-screen title, built at render time. */
  titleSource: {createdAt: string; file: StatementFile} | null;
  hasJob: boolean;
  isReplacementBlocked: boolean;
  outcome: ImportOutcome | null;
};

const OUTCOME_PHASE: Record<ImportOutcome['kind'], BadgePhase | null> = {
  deleted: 'deleted',
  gone_on_server: 'gone_on_server',
  upload_cancelled: null
};

const EMPTY_SUBJECT: ImportSubject = {
  phase: null,
  titleSource: null,
  hasJob: false,
  isReplacementBlocked: false,
  outcome: null
};

/**
 * A new statement that waits for the previous one to be deleted comes first, then the stored
 * operation, then the outcome of the one that just ended.
 */
const resolveImportSubject = (
  draft: ImportDraft | null,
  operation: ImportOperation | null,
  outcome: ImportOutcome | null
): ImportSubject => {
  if (draft?.phase === 'replacing_previous' && draft.format) {
    return {
      phase: 'replacing_previous',
      titleSource: {
        createdAt: draft.createdAt,
        file: {sizeBytes: draft.sizeBytes, format: draft.format}
      },
      hasJob: false,
      isReplacementBlocked: draft.isReplacementBlocked,
      outcome: null
    };
  }
  if (operation && operation.phase !== 'deleted' && operation.phase !== 'gone_on_server') {
    return {
      phase: toBadgePhase(operation.phase),
      titleSource: {createdAt: operation.createdAt, file: operation.file},
      hasJob: operation.jobId !== null,
      isReplacementBlocked: false,
      outcome: null
    };
  }
  if (!outcome) {
    return EMPTY_SUBJECT;
  }
  return {
    ...EMPTY_SUBJECT,
    phase: OUTCOME_PHASE[outcome.kind],
    titleSource: {createdAt: outcome.operation.createdAt, file: outcome.operation.file},
    outcome
  };
};

/** The subject of the import screens, from the store, without building objects in the selector. */
export const useImportSubject = (): ImportSubject => {
  const {draft, operation, outcome} = useImportStore(
    useShallow((state) => ({
      draft: state.draft,
      operation: state.operation,
      outcome: state.outcome
    }))
  );
  return resolveImportSubject(draft, operation, outcome);
};
