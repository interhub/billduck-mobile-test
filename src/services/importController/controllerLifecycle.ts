import {runCleanups} from '@/src/services/importController/cleanupFlow';
import {
  closeOperation,
  readStore,
  recordFor,
  tokenFor
} from '@/src/services/importController/controllerCore';
import {ControllerContext} from '@/src/services/importController/importControllerTypes';
import {pollJob} from '@/src/services/importController/jobPolling';
import {
  checkUploadAfterRestart,
  refreshStatus,
  verifyJob
} from '@/src/services/importController/retryFlow';
import {INITIAL_IMPORT_STATE} from '@/src/stores/importStore';
import {hasServerJob, isAwaitingUploadOutcome, isPolling} from '@/src/utils/import/importPhases';
import {listReferencedCopies} from '@/src/utils/import/importPolicy';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

/** Reads the stored operation at launch and removes every file copy it does not reference. */
export const restore = async (context: ControllerContext) => {
  const loaded = await context.repository.load();
  if (!loaded.success) {
    logger.e(LOG_NAME.error_log, {type: LOG_TYPE.restore_operation, error_kind: loaded.error.kind});
    context.store.setState({isRestored: true});
    return;
  }
  const {operation, pendingCleanups} = loaded.payload;
  context.files.removeAllExcept(listReferencedCopies(operation));
  context.store.setState({operation, pendingCleanups, isRestored: true});
};

/** Continues a stored operation after a launch: lookups and polls only, never a POST. */
export const resume = async (context: ControllerContext) => {
  void runCleanups(context);
  const operation = readStore(context).operation;
  if (!operation) {
    return;
  }
  const token = tokenFor(context, operation.operationId);
  if (operation.phase === 'deleted' || operation.phase === 'gone_on_server') {
    await closeOperation(context, operation, operation.phase, LOG_TYPE.restore_operation);
    return;
  }
  if (operation.phase === 'failed' || operation.phase === 'not_received') {
    return;
  }
  recordFor(context, token, {event: TIMELINE_EVENT.APP_RESTARTED});
  if (isAwaitingUploadOutcome(operation)) {
    await checkUploadAfterRestart(context, token);
    return;
  }
  if (hasServerJob(operation)) {
    await verifyJob(context, token);
  }
};

/** Back in the foreground: polling resumes, a ready job is read again, cleanups get a chance. */
export const onForeground = (context: ControllerContext) => {
  void runCleanups(context);
  const operation = readStore(context).operation;
  if (!operation) {
    return;
  }
  // A restored job is read only after `resume` checked in this launch that its key leads to it.
  const {verifiedJobs} = context.runtime.launchMemory;
  if (operation.jobId && !verifiedJobs.has(operation.operationId)) {
    return;
  }
  if (isPolling(operation)) {
    void pollJob(context, tokenFor(context, operation.operationId));
    return;
  }
  if (operation.phase === 'ready') {
    void refreshStatus(context);
  }
};

/** "Reset all": forgets the stored operation, the cleanup list, the copies and the journal. */
export const forgetEverything = (context: ControllerContext): Promise<void> =>
  context.serialize(async () => {
    context.runtime.startNextGeneration();
    context.runtime.abortUpload();
    const saved = await context.repository.save({operation: null, pendingCleanups: []});
    if (!saved.success) {
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.mock_control,
        error_kind: saved.error.kind,
        http_status: saved.error.httpStatus
      });
      return;
    }
    context.files.removeAllExcept([]);
    context.store.setState({...INITIAL_IMPORT_STATE, isRestored: true});
  });
