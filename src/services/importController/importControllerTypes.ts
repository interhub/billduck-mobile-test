import {ImportsApi} from '@/src/api/importsApi/importsApi';
import {OperationRepository} from '@/src/services/importController/operationRepository';
import {ImportStoreApi} from '@/src/stores/importStore';
import {AppActivity, StatementFileStore} from '@/src/types/statementFiles';
import {LaunchMemory} from '@/src/utils/import/retryAction';
import {CoalescedRunner} from '@/src/utils/promise/createCoalescedRunner';
import {SerialQueue} from '@/src/utils/promise/createSerialQueue';
import {SingleFlight} from '@/src/utils/promise/createSingleFlight';
import {WaitFunction} from '@/src/utils/promise/wait';

export type ImportControllerDeps = {
  api: ImportsApi;
  repository: OperationRepository;
  files: StatementFileStore;
  store: ImportStoreApi;
  activity: AppActivity;
  createUuid: () => string;
  now: () => Date;
  wait: WaitFunction;
};

/**
 * What one controller keeps in memory; the operation itself lives on disk and in the store. The
 * steps change it only through these functions.
 */
export type ControllerRuntime = {
  /** Grows whenever the operation the phone works on is closed, so its late answers are dropped. */
  generation: () => number;
  startNextGeneration: () => void;
  /** Disk writes that failed in this launch; a step that needed one stopped where it was. */
  writeFailures: () => number;
  countWriteFailure: () => void;
  isPicking: () => boolean;
  /** The picker runs with the flag up, so a second press is dropped. */
  whilePicking: <T>(task: () => Promise<T>) => Promise<T>;
  isSending: () => boolean;
  /** "Send" runs with the flag up: a second press is dropped and the draft cannot be cancelled. */
  whileSending: <T>(task: () => Promise<T>) => Promise<T>;
  /** Holds the POST in flight while it runs, so "Cancel upload" and "Reset all" can abort it. */
  whileUploading: <T>(upload: AbortController, task: () => Promise<T>) => Promise<T>;
  abortUpload: () => void;
  launchMemory: LaunchMemory;
  rememberSentUpload: (operationId: string) => void;
  rememberVerifiedJob: (operationId: string) => void;
};

/** Everything a step of the controller works with: the dependencies, the memory, the guards. */
export type ControllerContext = ImportControllerDeps & {
  runtime: ControllerRuntime;
  /** The one queue of disk writes: two read-modify-writes never interleave. */
  serialize: SerialQueue;
  pollingFlight: SingleFlight;
  recoveryFlight: SingleFlight;
  deletionFlight: SingleFlight;
  cleanupRunner: CoalescedRunner;
};
