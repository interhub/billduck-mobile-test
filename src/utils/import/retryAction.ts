import {ConfirmedDraft, ImportDraft} from '@/src/types/importDraft';
import {ImportOperation} from '@/src/types/importOperation';
import {isReplacingPrevious} from '@/src/utils/import/importPhases';

/** What "Retry" does, chosen from the state on screen and from what this launch did. */
export enum RETRY_ACTION {
  /** The previous statement was not deleted: delete it again, then send the new one. */
  REPLACE = 'replace',
  /** The deletion failed: the same DELETE again, with the stored delete key. */
  DELETE = 'delete',
  /** The server was silent about a job checked in this launch: read its status again. */
  READ_JOB = 'read_job',
  /** The server was silent about a stored job: its key must lead to it first. */
  VERIFY_JOB = 'verify_job',
  /** The server was silent after an upload of this launch: the lookups by key run again. */
  RECOVER = 'recover',
  /** The server was silent about an upload of an earlier launch: a lookup by key, never a POST. */
  CHECK_UPLOAD = 'check_upload'
}

/** What this launch did: the uploads it sent itself and the stored jobs whose key it checked. */
export type LaunchMemory = {
  /** Uploads whose first POST was made by this launch: only they are sent again without asking. */
  sentUploads: ReadonlySet<string>;
  /** Stored jobs whose key was checked in this launch. */
  verifiedJobs: ReadonlySet<string>;
};

type RetryState = {
  draft: ImportDraft | null;
  operation: ImportOperation | null;
  launchMemory: LaunchMemory;
};

/** Every action but the replacement works on the stored operation. */
type OperationAction = Exclude<RETRY_ACTION, RETRY_ACTION.REPLACE>;

type RetryPlan =
  | {action: RETRY_ACTION.REPLACE; draft: ConfirmedDraft}
  | {action: OperationAction; operationId: string};

const resolveSilentServerAction = (
  operation: ImportOperation,
  launchMemory: LaunchMemory
): OperationAction => {
  if (operation.jobId && launchMemory.verifiedJobs.has(operation.operationId)) {
    return RETRY_ACTION.READ_JOB;
  }
  if (operation.jobId) {
    return RETRY_ACTION.VERIFY_JOB;
  }
  if (launchMemory.sentUploads.has(operation.operationId)) {
    return RETRY_ACTION.RECOVER;
  }
  return RETRY_ACTION.CHECK_UPLOAD;
};

/** "Retry" for the blocked replacement, a failed deletion or a silent server; null otherwise. */
export const resolveRetryPlan = ({
  draft,
  operation,
  launchMemory
}: RetryState): RetryPlan | null => {
  if (isReplacingPrevious(draft) && draft.isReplacementBlocked) {
    return {action: RETRY_ACTION.REPLACE, draft};
  }
  if (operation?.phase === 'delete_failed') {
    return {action: RETRY_ACTION.DELETE, operationId: operation.operationId};
  }
  if (operation?.phase !== 'server_unavailable') {
    return null;
  }
  return {
    action: resolveSilentServerAction(operation, launchMemory),
    operationId: operation.operationId
  };
};
