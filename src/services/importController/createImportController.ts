import {cancelUpload, runCleanups} from '@/src/services/importController/cleanupFlow';
import {
  forgetEverything,
  onForeground,
  restore,
  resume
} from '@/src/services/importController/controllerLifecycle';
import {deleteImport} from '@/src/services/importController/deletionFlow';
import {cancelDraft, pickFile} from '@/src/services/importController/draftFlow';
import {
  ControllerContext,
  ControllerRuntime,
  ImportControllerDeps
} from '@/src/services/importController/importControllerTypes';
import {refreshStatus, retry} from '@/src/services/importController/retryFlow';
import {send, sendAgain} from '@/src/services/importController/sendFlow';
import {createCoalescedRunner} from '@/src/utils/promise/createCoalescedRunner';
import {createSerialQueue} from '@/src/utils/promise/createSerialQueue';
import {createSingleFlight} from '@/src/utils/promise/createSingleFlight';

type RuntimeMemory = {
  generation: number;
  writeFailures: number;
  isPicking: boolean;
  isSending: boolean;
  currentUpload: AbortController | null;
};

const createControllerRuntime = (): ControllerRuntime => {
  const memory: RuntimeMemory = {
    generation: 0,
    writeFailures: 0,
    isPicking: false,
    isSending: false,
    currentUpload: null
  };
  const sentUploads = new Set<string>();
  const verifiedJobs = new Set<string>();
  const withFlag = async <T>(flag: 'isPicking' | 'isSending', task: () => Promise<T>) => {
    memory[flag] = true;
    try {
      return await task();
    } finally {
      memory[flag] = false;
    }
  };
  return {
    generation: () => memory.generation,
    startNextGeneration: () => {
      memory.generation += 1;
    },
    writeFailures: () => memory.writeFailures,
    countWriteFailure: () => {
      memory.writeFailures += 1;
    },
    isPicking: () => memory.isPicking,
    whilePicking: (task) => withFlag('isPicking', task),
    isSending: () => memory.isSending,
    whileSending: (task) => withFlag('isSending', task),
    whileUploading: async (upload, task) => {
      memory.currentUpload = upload;
      try {
        return await task();
      } finally {
        if (memory.currentUpload === upload) {
          memory.currentUpload = null;
        }
      }
    },
    abortUpload: () => {
      memory.currentUpload?.abort();
    },
    launchMemory: {sentUploads, verifiedJobs},
    rememberSentUpload: (operationId) => {
      sentUploads.add(operationId);
    },
    rememberVerifiedJob: (operationId) => {
      verifiedJobs.add(operationId);
    }
  };
};

/**
 * The long-lived owner of the import. Screens call its actions and read `importStore`; every
 * server answer goes through the phase reducer, and every change of the operation reaches the
 * disk before the store shows it. No action rejects: a failure becomes a phase, a timeline row
 * or a log, so a screen may start any action with `void`. Nothing here navigates.
 */
export const createImportController = (deps: ImportControllerDeps) => {
  const context: ControllerContext = {
    ...deps,
    runtime: createControllerRuntime(),
    serialize: createSerialQueue(),
    pollingFlight: createSingleFlight(),
    recoveryFlight: createSingleFlight(),
    deletionFlight: createSingleFlight(),
    cleanupRunner: createCoalescedRunner()
  };
  return {
    restore: () => restore(context),
    resume: () => resume(context),
    pickFile: () => pickFile(context),
    send: () => send(context),
    cancelDraft: () => cancelDraft(context),
    sendAgain: () => sendAgain(context),
    retry: () => retry(context),
    cancelUpload: () => cancelUpload(context),
    deleteImport: () => deleteImport(context),
    refreshStatus: () => refreshStatus(context),
    onForeground: () => onForeground(context),
    runCleanups: () => runCleanups(context),
    forgetEverything: () => forgetEverything(context)
  };
};

export type ImportController = ReturnType<typeof createImportController>;
