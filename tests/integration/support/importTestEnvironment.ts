import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  openSync,
  closeSync,
  readdirSync,
  readFileSync,
  readSync,
  rmSync,
  statSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createImportsApi, FileUploader} from '@/src/api/importsApi/importsApi';
import {
  createMockControlApi,
  MockCounters,
  MOCK_SCENARIO
} from '@/src/api/importsApi/mockControlApi';
import {
  createImportController,
  ImportController
} from '@/src/services/importController/createImportController';
import {
  AppActivity,
  StatementFileStore
} from '@/src/services/importController/importControllerTypes';
import {
  createOperationRepository,
  KeyValueStorage
} from '@/src/services/importController/operationRepository';
import {INITIAL_IMPORT_STATE, ImportStoreState, useImportStore} from '@/src/stores/importStore';
import {wait} from '@/src/utils/promise/wait';

export const FIXTURES = path.resolve(__dirname, '../../../mobile-engineer-candidate-kit/fixtures');

export type RecordedRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyBytes: number | null;
};

type QueuedPick = {source: string; name: string; mimeType: string | null} | 'cancel';

const baseUrl = (): string => {
  const url = process.env.MOCK_BASE_URL;
  if (!url) {
    throw new Error('MOCK_BASE_URL is not set: the integration global setup did not run');
  }
  return url;
};

const realFetch = globalThis.fetch;

/** Every request the client sends goes through here; "offline" fails it before the network. */
export const network = {
  isOffline: false,
  recorded: [] as RecordedRequest[]
};

const isTestRoute = (url: string): boolean => url.includes('/__test/') || url.endsWith('/health');

const toHeaderRecord = (headers: HeadersInit | undefined): Record<string, string> => {
  return Object.fromEntries(new Headers(headers).entries());
};

globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!isTestRoute(url)) {
    network.recorded.push({
      method: init?.method ?? 'GET',
      url,
      headers: toHeaderRecord(init?.headers),
      bodyBytes: null
    });
    if (network.isOffline) {
      throw new TypeError('Network request failed');
    }
  }
  return realFetch(input, init);
};

/** Sends the same bytes and headers as the native upload task, from Node. */
const uploadFromNode: FileUploader = async ({url, fileUri, headers, signal}) => {
  const body = readFileSync(fileUri);
  network.recorded.push({
    method: 'POST',
    url,
    headers: toHeaderRecord(headers),
    bodyBytes: body.length
  });
  if (network.isOffline) {
    throw new TypeError('Network request failed');
  }
  const response = await realFetch(url, {method: 'POST', headers, body, signal});
  return {status: response.status, body: await response.text()};
};

const createMemoryStorage = (): KeyValueStorage => {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    }
  };
};

/** Private copies in a temp folder, named by operation id, like `Paths.cache/imports/` on the phone. */
const createNodeFileStore = (directory: string) => {
  const picks: QueuedPick[] = [];
  const copyPath = (operationId: string) => path.join(directory, operationId);
  const files: StatementFileStore = {
    pickStatement: async (operationId) => {
      const next = picks.shift();
      if (!next || next === 'cancel') {
        return {success: true, payload: null};
      }
      copyFileSync(next.source, copyPath(operationId));
      return {
        success: true,
        payload: {
          originalName: next.name,
          mimeType: next.mimeType,
          reportedSizeBytes: statSync(next.source).size
        }
      };
    },
    readCopySize: (operationId) =>
      existsSync(copyPath(operationId)) ? statSync(copyPath(operationId)).size : null,
    readCopyHeader: (operationId, length) => {
      if (!existsSync(copyPath(operationId))) {
        return null;
      }
      const descriptor = openSync(copyPath(operationId), 'r');
      try {
        const buffer = Buffer.alloc(length);
        const bytesRead = readSync(descriptor, buffer, 0, length, 0);
        return new Uint8Array(buffer.subarray(0, bytesRead));
      } finally {
        closeSync(descriptor);
      }
    },
    hasCopy: (operationId) => existsSync(copyPath(operationId)),
    getCopyUri: (operationId) => copyPath(operationId),
    removeCopy: (operationId) => {
      rmSync(copyPath(operationId), {force: true});
    },
    removeAllExcept: (operationIds) => {
      for (const fileName of readdirSync(directory)) {
        if (!operationIds.includes(fileName)) {
          rmSync(path.join(directory, fileName), {force: true});
        }
      }
    }
  };
  return {files, picks, listCopies: () => readdirSync(directory)};
};

const ALWAYS_ACTIVE: AppActivity = {isActive: () => true, whenActive: () => Promise.resolve()};

const NEVER_ACTIVE: AppActivity = {
  isActive: () => false,
  whenActive: () => new Promise(() => undefined)
};

export type TestProcess = {
  controller: ImportController;
  /** Freezes this process for good, as a crash would. */
  crash: () => void;
};

/**
 * One phone: a temp folder for private copies, an in-memory AsyncStorage and the shared store.
 * `launch` starts an app process on it; launching again after `crash` is a relaunch.
 */
export const createPhone = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'billduck-copies-'));
  const storage = createMemoryStorage();
  const fileStore = createNodeFileStore(directory);
  const counter = {value: 0};
  const createKey = () => {
    counter.value += 1;
    return `itest-${Date.now()}-${counter.value}`;
  };
  const launch = (): TestProcess => {
    const activity = {current: ALWAYS_ACTIVE};
    const controller = createImportController({
      api: createImportsApi({baseUrl: baseUrl(), uploadFile: uploadFromNode}),
      repository: createOperationRepository(storage),
      files: fileStore.files,
      store: useImportStore,
      activity: {
        isActive: () => activity.current.isActive(),
        whenActive: () => activity.current.whenActive()
      },
      createKey,
      now: () => new Date(),
      wait
    });
    return {
      controller,
      crash: () => {
        activity.current = NEVER_ACTIVE;
      }
    };
  };
  return {
    launch,
    storage,
    pickFixture: (fixture: string, name = fixture, mimeType: string | null = null) => {
      fileStore.picks.push({source: path.join(FIXTURES, fixture), name, mimeType});
    },
    listCopies: fileStore.listCopies,
    dispose: () => {
      rmSync(directory, {recursive: true, force: true});
    }
  };
};

export const mock = createMockControlApi(baseUrl());

/** Resets the mock and the shared store, then sets the scenario of the test. */
export const startScenario = async (scenario: MOCK_SCENARIO) => {
  network.isOffline = false;
  network.recorded = [];
  useImportStore.setState({...INITIAL_IMPORT_STATE});
  const reset = await mock.reset();
  const switched = await mock.setScenario(scenario);
  if (!reset.success || !switched.success) {
    throw new Error('the mock did not accept the reset or the scenario');
  }
};

export const readCounters = async (): Promise<MockCounters> => {
  const state = await mock.getState();
  if (!state.success) {
    throw new Error('the mock state could not be read');
  }
  return state.payload.stats;
};

const POLL_STEP_MS = 50;

/** Waits until the import store matches, failing with the last state after the deadline. */
export const waitForImport = async (
  isDone: (state: ImportStoreState) => boolean,
  timeoutMs = 15_000
): Promise<ImportStoreState> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = useImportStore.getState();
    if (isDone(state)) {
      return state;
    }
    await wait(POLL_STEP_MS);
  }
  const {operation, draft} = useImportStore.getState();
  throw new Error(`timed out; phase=${operation?.phase ?? 'none'} draft=${draft?.phase ?? 'none'}`);
};

export const importPhase = () => useImportStore.getState().operation?.phase ?? null;
