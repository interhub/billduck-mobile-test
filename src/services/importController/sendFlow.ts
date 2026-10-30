import {
  closeOperation,
  dispatch,
  readStore,
  saveSnapshot,
  tokenFor
} from '@/src/services/importController/controllerCore';
import {deleteImport} from '@/src/services/importController/deletionFlow';
import {dropDraft, isAddingAllowed} from '@/src/services/importController/draftFlow';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {sendAndRecover} from '@/src/services/importController/uploadFlow';
import {ConfirmedDraft} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';
import {canDeleteOnServer, isConfirmedDraft} from '@/src/utils/import/importPhases';
import {LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

/** The operation of a confirmed draft, as it is stored before its first POST. */
const buildUploadingOperation = (draft: ConfirmedDraft): ImportOperation => ({
  operationId: draft.operationId,
  idempotencyKey: draft.idempotencyKey,
  deleteKey: null,
  phase: 'uploading',
  jobId: null,
  revision: 0,
  serverStatus: null,
  failure: null,
  file: {sizeBytes: draft.sizeBytes, format: draft.format},
  serverFileName: draft.serverFileName,
  createdAt: draft.createdAt,
  updatedAt: draft.createdAt
});

/**
 * Stores the new operation with its key, then sends it: the key is on disk before the POST.
 * When the disk refuses the write nothing is sent, and the draft goes with its copy.
 */
const sendNew = async (context: ControllerContext, draft: ConfirmedDraft) => {
  const operation = buildUploadingOperation(draft);
  const isStored = await context.serialize(async () => {
    context.runtime.startNextGeneration();
    const {pendingCleanups} = readStore(context);
    const isSaved = await saveSnapshot(context, operation, pendingCleanups, LOG_TYPE.create_import);
    if (isSaved) {
      context.store.setState({
        draft: null,
        payments: null,
        outcome: null,
        isPollingSilent: false,
        lastAnswerAt: null
      });
    }
    return isSaved;
  });
  if (!isStored) {
    dropDraft(context, draft);
    return;
  }
  context.runtime.rememberSentUpload(operation.operationId);
  await sendAndRecover(context, tokenFor(context, operation.operationId));
};

/** Marks the waiting draft, unless the person dropped it meanwhile. */
const markReplacement = (context: ControllerContext, isReplacementBlocked: boolean) => {
  const draft = readStore(context).draft;
  if (!isConfirmedDraft(draft)) {
    return;
  }
  context.store.setState({draft: {...draft, phase: 'replacing_previous', isReplacementBlocked}});
};

/** The previous statement leaves the server first; false when it did not, so nothing is sent. */
const clearPrevious = async (context: ControllerContext): Promise<boolean> => {
  const previous = readStore(context).operation;
  if (!previous) {
    return true;
  }
  if (!canDeleteOnServer(previous)) {
    await closeOperation(context, previous, null, LOG_TYPE.create_import);
    return true;
  }
  markReplacement(context, false);
  const deletion = await deleteImport(context);
  if (deletion === 'deleted' || deletion === 'gone') {
    return true;
  }
  markReplacement(context, true);
  return false;
};

/** The previous statement leaves the server before the new one is sent, or the new one waits. */
export const replaceAndSend = async (context: ControllerContext, draft: ConfirmedDraft) => {
  const isPreviousCleared = await clearPrevious(context);
  if (isPreviousCleared) {
    await sendNew(context, draft);
  }
};

/** "Send": one key, one request, however many times the button is pressed. */
export const send = async (context: ControllerContext): Promise<void> => {
  const draft = readStore(context).draft;
  if (context.runtime.isSending() || draft?.phase !== 'confirming' || !isAddingAllowed(context)) {
    return;
  }
  await context.runtime.whileSending(async () => {
    context.store.setState({timeline: [], outcome: null});
    await replaceAndSend(context, draft);
  });
};

/** "Send again" after a restart found nothing on the server: the same key and the same bytes. */
export const sendAgain = async (context: ControllerContext) => {
  const operation = readStore(context).operation;
  if (operation?.phase !== 'not_received') {
    return;
  }
  const token = tokenFor(context, operation.operationId);
  const transition = await dispatch(
    context,
    token,
    {type: 'resend_requested'},
    LOG_TYPE.create_import
  );
  if (!transition?.accepted) {
    return;
  }
  context.runtime.rememberSentUpload(operation.operationId);
  await sendAndRecover(context, token);
};
