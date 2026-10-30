import {IllustrationName} from '@/src/components/ui/Illustration';
import {Translation} from '@/src/i18n/translationsEn';
import {ImportFailure} from '@/src/types/importOperation';
import {BadgePhase, POLLING_PHASES} from '@/src/utils/import/importPhases';

/** What the status screen needs to say about the current phase. */
export type StatusDescription = {
  badgePhase: BadgePhase;
  explanation: string;
  illustration: IllustrationName;
};

type StatusInput = {
  phase: BadgePhase;
  hasJob: boolean;
  /** Two status reads in a row got no answer while the job was being polled. */
  isPollingSilent: boolean;
  isReplacementBlocked: boolean;
  failure: ImportFailure | null;
};

const ILLUSTRATION_BY_PHASE: Record<BadgePhase, IllustrationName> = {
  uploading: 'waiting',
  queued: 'waiting',
  processing: 'waiting',
  ready: 'ready',
  reconnecting: 'unknown',
  not_received: 'unknown',
  server_unavailable: 'error',
  failed: 'error',
  replacing_previous: 'deleting',
  deleting: 'deleting',
  delete_failed: 'error',
  deleted: 'deleted',
  gone_on_server: 'unknown'
};

const explain = (
  {phase, hasJob, isReplacementBlocked, failure}: StatusInput,
  t: Translation
): string => {
  const texts = t.importStatus.explanation;
  switch (phase) {
    case 'uploading':
      return texts.uploading;
    case 'queued':
      return texts.queued;
    case 'processing':
      return texts.processing;
    case 'ready':
      return texts.ready;
    case 'reconnecting':
      if (hasJob) {
        return texts.reconnectingJob;
      }
      return texts.reconnectingUpload;
    case 'server_unavailable':
      if (hasJob) {
        return texts.serverUnavailableJob;
      }
      return texts.serverUnavailableUpload;
    case 'not_received':
      return texts.notReceived;
    case 'failed':
      if (failure?.reason === 'file_missing') {
        return texts.failedFileMissing;
      }
      return texts.failedRejected;
    case 'replacing_previous':
      if (isReplacementBlocked) {
        return texts.replaceBlocked;
      }
      return texts.replacingPrevious;
    case 'deleting':
      return texts.deleting;
    case 'delete_failed':
      return texts.deleteFailed;
    case 'deleted':
      return texts.deleted;
    case 'gone_on_server':
      return texts.goneOnServer;
    default:
      return '';
  }
};

/**
 * The honest wording of a phase. A polled job whose reads go unanswered says it is reconnecting,
 * while its stored phase stays what the server last said.
 */
export const describeImportStatus = (input: StatusInput, t: Translation): StatusDescription => {
  if (input.isPollingSilent && POLLING_PHASES.includes(input.phase)) {
    return {
      badgePhase: 'reconnecting',
      explanation: t.importStatus.explanation.reconnectingJob,
      illustration: ILLUSTRATION_BY_PHASE.reconnecting
    };
  }
  return {
    badgePhase: input.phase,
    explanation: explain(input, t),
    illustration: ILLUSTRATION_BY_PHASE[input.phase]
  };
};
