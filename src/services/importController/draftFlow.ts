import {nowIso, readStore} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {CheckingDraft, ImportDraft} from '@/src/types/importDraft';
import {StatementFormat} from '@/src/types/importOperation';
import {PickedStatement} from '@/src/types/statementFiles';
import {buildServerFileName} from '@/src/utils/files/buildServerFileName';
import {checkPickedStatement} from '@/src/utils/files/checkPickedStatement';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {toKilobytes} from '@/src/utils/format/formatFileSize';
import {canAddStatement} from '@/src/utils/import/canAddStatement';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

export const isAddingAllowed = (context: ControllerContext): boolean => {
  const {operation, draft} = readStore(context);
  return canAddStatement(operation, draft);
};

const buildCheckingDraft = (context: ControllerContext, operationId: string): CheckingDraft => ({
  operationId,
  phase: 'validating',
  originalName: '',
  sizeBytes: 0,
  format: null,
  rejection: null,
  idempotencyKey: null,
  serverFileName: null,
  createdAt: nowIso(context),
  isReplacementBlocked: false
});

/** The check refused the file: its copy goes at once and the draft says why. */
const rejectDraft = (
  context: ControllerContext,
  draft: CheckingDraft,
  reason: STATEMENT_REJECTION,
  sizeBytes: number
) => {
  context.files.removeCopy(draft.operationId);
  context.store.setState({draft: {...draft, phase: 'rejected', rejection: reason, sizeBytes}});
  logger.w(LOG_NAME.warning_log, {type: LOG_TYPE.pick_file, size_kb: toKilobytes(sizeBytes)});
};

/** The check passed: the idempotency key and the name for the server are created now, once. */
const confirmDraft = (
  context: ControllerContext,
  draft: CheckingDraft,
  format: StatementFormat,
  sizeBytes: number
) => {
  context.store.setState({
    draft: {
      ...draft,
      phase: 'confirming',
      sizeBytes,
      format,
      idempotencyKey: context.createUuid(),
      serverFileName: buildServerFileName(new Date(draft.createdAt), format)
    }
  });
  logger.d(LOG_NAME.debug_log, {
    type: LOG_TYPE.pick_file,
    format,
    size_kb: toKilobytes(sizeBytes)
  });
};

const checkDraft = (context: ControllerContext, draft: CheckingDraft, picked: PickedStatement) => {
  const verdict = checkPickedStatement(context.files, draft.operationId, picked);
  if (!verdict.success) {
    rejectDraft(context, draft, verdict.reason, verdict.sizeBytes);
    return;
  }
  confirmDraft(context, draft, verdict.format, verdict.sizeBytes);
};

/** The picker, then the check; false when the person picked nothing. */
const pickAndCheck = async (context: ControllerContext, operationId: string): Promise<boolean> => {
  const picked = await context.files.pickStatement(operationId);
  const draft = buildCheckingDraft(context, operationId);
  if (!picked.success) {
    context.store.setState({draft});
    rejectDraft(context, draft, STATEMENT_REJECTION.UNREADABLE, 0);
    return true;
  }
  if (picked.payload === null) {
    context.files.removeCopy(operationId);
    return false;
  }
  const checking = {...draft, originalName: picked.payload.originalName};
  context.store.setState({draft: checking});
  checkDraft(context, checking, picked.payload);
  return true;
};

/**
 * Opens the system picker and checks the chosen file before any network. Resolves true when a
 * file was chosen: the draft then shows the verdict, a refusal included. Resolves false when
 * nothing was picked: the person cancelled, the picker is already open, a draft is still there,
 * or a new statement cannot be added now.
 */
export const pickFile = async (context: ControllerContext): Promise<boolean> => {
  if (context.runtime.isPicking() || !isAddingAllowed(context) || readStore(context).draft) {
    return false;
  }
  return context.runtime.whilePicking(() => pickAndCheck(context, context.createUuid()));
};

/** The draft and its private copy go together; a draft picked since then stays. */
export const dropDraft = (context: ControllerContext, draft: ImportDraft) => {
  context.files.removeCopy(draft.operationId);
  if (readStore(context).draft?.operationId === draft.operationId) {
    context.store.setState({draft: null});
  }
};

/** "Cancel" on the confirm screen, "Choose another file", or a blocked replacement given up. */
export const cancelDraft = (context: ControllerContext) => {
  const draft = readStore(context).draft;
  if (!draft || context.runtime.isSending()) {
    return;
  }
  dropDraft(context, draft);
};
