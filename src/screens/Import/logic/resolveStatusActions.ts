import {Translation} from '@/src/i18n/translationsEn';
import {ImportFailure} from '@/src/types/importOperation';
import {BadgePhase} from '@/src/utils/import/importPhases';

export type StatusActionId =
  | 'retry'
  | 'sendAgain'
  | 'cancelUpload'
  | 'deleteRunningImport'
  | 'cancelReplacement'
  | 'openReport'
  | 'pickAgain'
  | 'toHome';

export type StatusActionHandlers = Record<StatusActionId, () => void>;

type StatusAction = {
  variant: 'primary' | 'quiet';
  testID: string;
};

type StatusActionInput = {
  phase: BadgePhase | null;
  hasJob: boolean;
  isReplacementBlocked: boolean;
};

/** One yellow button at most per phase; the ways out are quiet. */
export const STATUS_ACTION: Record<StatusActionId, StatusAction> = {
  retry: {variant: 'primary', testID: 'import_status_retry_button'},
  sendAgain: {variant: 'primary', testID: 'import_status_send_again_button'},
  cancelUpload: {variant: 'quiet', testID: 'import_status_cancel_upload_button'},
  deleteRunningImport: {variant: 'quiet', testID: 'import_status_cancel_button'},
  cancelReplacement: {variant: 'quiet', testID: 'import_status_cancel_button'},
  openReport: {variant: 'primary', testID: 'import_status_open_report_button'},
  pickAgain: {variant: 'primary', testID: 'import_status_pick_again_button'},
  toHome: {variant: 'primary', testID: 'import_status_home_button'}
};

/** An upload can be cancelled only while the server has no job for it. */
const cancelUploadFor = (hasJob: boolean): StatusActionId[] => {
  if (hasJob) {
    return [];
  }
  return ['cancelUpload'];
};

/** The actions the current phase offers, in the order they stand in the footer. */
export const resolveStatusActions = ({
  phase,
  hasJob,
  isReplacementBlocked
}: StatusActionInput): StatusActionId[] => {
  switch (phase) {
    case 'queued':
    case 'processing':
      return ['deleteRunningImport'];
    case 'server_unavailable':
      return ['retry', ...cancelUploadFor(hasJob)];
    case 'not_received':
      return ['sendAgain', ...cancelUploadFor(hasJob)];
    case 'failed':
      return ['pickAgain'];
    case 'ready':
      return ['openReport'];
    case 'replacing_previous':
      if (!isReplacementBlocked) {
        return [];
      }
      return ['retry', 'cancelReplacement'];
    case 'delete_failed':
      return ['retry'];
    case 'gone_on_server':
      return ['toHome'];
    case 'uploading':
    case 'reconnecting':
    case 'deleting':
    case 'deleted':
    case null:
      return [];
  }
};

/** A copy that vanished asks for the same file again; a refused file asks for another one. */
const describePickAgain = (failure: ImportFailure | null, translations: Translation): string => {
  if (failure?.reason === 'file_missing') {
    return translations.importStatus.pickAgain;
  }
  return translations.common.chooseAnother;
};

export const describeActionTitle = (
  actionId: StatusActionId,
  failure: ImportFailure | null,
  translations: Translation
): string => {
  switch (actionId) {
    case 'retry':
      return translations.common.retry;
    case 'sendAgain':
      return translations.importStatus.sendAgain;
    case 'cancelUpload':
      return translations.importStatus.cancelUpload;
    case 'deleteRunningImport':
      return translations.importStatus.cancelImport;
    case 'cancelReplacement':
      return translations.common.cancel;
    case 'openReport':
      return translations.importStatus.openReport;
    case 'pickAgain':
      return describePickAgain(failure, translations);
    case 'toHome':
      return translations.importStatus.toHome;
  }
};
