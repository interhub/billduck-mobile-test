import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  createMockControlApi,
  MockCounters,
  MockState,
  MOCK_SCENARIO
} from '@/src/api/importsApi/mockControlApi';
import {
  createImportController,
  ImportController
} from '@/src/services/importController/createImportController';
import {createOperationRepository} from '@/src/services/importController/operationRepository';
import {INITIAL_IMPORT_STATE, ImportStoreState, useImportStore} from '@/src/stores/importStore';
import {ImportPhase} from '@/src/types/importOperation';
import {AppActivity} from '@/src/types/statementFiles';
import {wait} from '@/src/utils/promise/wait';
import {createMemoryStorage, createNodeFileStore} from '@/tests/integration/support/nodeFileStore';
import {createNodeImportsApi, mockBaseUrl, network} from '@/tests/integration/support/nodeNetwork';

export const FIXTURES = path.resolve(__dirname, '../../../mobile-engineer-candidate-kit/fixtures');

/** How long a test waits for the import to reach a state before it fails with the last one. */
const IMPORT_WAIT_TIMEOUT_MS = 15_000;
const IMPORT_WAIT_STEP_MS = 50;

/** What the system picker reports for a fixture: the shown name and the type, never the path. */
type FixturePick = {name?: string; mimeType?: string | null};

const ALWAYS_ACTIVE: AppActivity = {isActive: () => true, whenActive: () => Promise.resolve()};

const NEVER_ACTIVE: AppActivity = {
  isActive: () => false,
  whenActive: () => new Promise(() => undefined)
};

export type TestProcess = {
  controller: ImportController;
  /** Picks a kit fixture and presses "Send", without waiting for the outcome. */
  sendFixture: (fixture: string, pick?: FixturePick) => Promise<void>;
  /** Freezes this process for good, as a crash would. */
  crash: () => void;
};

const openPhones: {dispose: () => void}[] = [];

/**
 * One phone: a temp folder for private copies, an in-memory AsyncStorage and the shared store.
 * `launch` starts an app process on it; launching again after a crash is a relaunch.
 */
export const createPhone = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'billduck-copies-'));
  const storage = createMemoryStorage();
  const fileStore = createNodeFileStore(directory);
  const processes: TestProcess[] = [];
  const counter = {value: 0};
  const createUuid = () => {
    counter.value += 1;
    return `itest-${Date.now()}-${counter.value}`;
  };
  const pickFixture = (fixture: string, {name = fixture, mimeType = null}: FixturePick = {}) => {
    fileStore.picks.push({source: path.join(FIXTURES, fixture), name, mimeType});
  };
  const launch = (): TestProcess => {
    const activity = {current: ALWAYS_ACTIVE};
    const controller = createImportController({
      api: createNodeImportsApi(),
      repository: createOperationRepository(storage),
      files: fileStore.files,
      store: useImportStore,
      activity: {
        isActive: () => activity.current.isActive(),
        whenActive: () => activity.current.whenActive()
      },
      createUuid,
      now: () => new Date(),
      wait
    });
    const launched: TestProcess = {
      controller,
      sendFixture: async (fixture, pick) => {
        pickFixture(fixture, pick);
        await controller.pickFile();
        void controller.send();
      },
      crash: () => {
        activity.current = NEVER_ACTIVE;
      }
    };
    processes.push(launched);
    return launched;
  };
  const phone = {
    launch,
    storage,
    pickFixture,
    listCopies: fileStore.listCopies,
    dispose: () => {
      for (const launched of processes) {
        launched.crash();
      }
      rmSync(directory, {recursive: true, force: true});
    }
  };
  openPhones.push(phone);
  return phone;
};

export type TestPhone = ReturnType<typeof createPhone>;

/** Freezes every process of the phones a test made and deletes their folders: run after each test. */
export const disposePhones = () => {
  for (const phone of openPhones.splice(0)) {
    phone.dispose();
  }
};

/**
 * A crash and a relaunch on the same phone: the old process freezes, the memory is gone, the
 * storage and the private copies stay. The new process has read the storage.
 */
export const relaunch = async (phone: TestPhone, crashed: TestProcess): Promise<TestProcess> => {
  crashed.crash();
  useImportStore.setState({...INITIAL_IMPORT_STATE});
  const relaunched = phone.launch();
  await relaunched.controller.restore();
  return relaunched;
};

/** The mock's test routes, made on use: the base URL exists only after the global setup. */
const mockControl = () => createMockControlApi(mockBaseUrl());

/** Resets the mock: its jobs and counters are gone and the job numbers start again. */
export const resetMock = async () => {
  const reset = await mockControl().reset();
  if (!reset.success) {
    throw new Error('the mock did not accept the reset');
  }
};

export const switchScenario = async (scenario: MOCK_SCENARIO) => {
  const switched = await mockControl().setScenario(scenario);
  if (!switched.success) {
    throw new Error(`the mock did not accept the scenario ${scenario}`);
  }
};

/** Resets the recorder, the shared store and the mock, then sets the scenario of the test. */
export const startScenario = async (scenario: MOCK_SCENARIO) => {
  network.isOffline = false;
  network.recorded = [];
  useImportStore.setState({...INITIAL_IMPORT_STATE});
  await resetMock();
  await switchScenario(scenario);
};

export const readMockState = async (): Promise<MockState> => {
  const state = await mockControl().getState();
  if (!state.success) {
    throw new Error('the mock state could not be read');
  }
  return state.payload;
};

export const readCounters = async (): Promise<MockCounters> => (await readMockState()).stats;

/** Waits until the import store matches, failing with the last state after the deadline. */
export const waitForImport = async (
  isDone: (state: ImportStoreState) => boolean
): Promise<ImportStoreState> => {
  const deadline = Date.now() + IMPORT_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = useImportStore.getState();
    if (isDone(state)) {
      return state;
    }
    await wait(IMPORT_WAIT_STEP_MS);
  }
  const {operation, draft} = useImportStore.getState();
  throw new Error(`timed out; phase=${operation?.phase ?? 'none'} draft=${draft?.phase ?? 'none'}`);
};

export const waitForPhase = (phase: ImportPhase) =>
  waitForImport((state) => state.operation?.phase === phase);

export const importPhase = () => useImportStore.getState().operation?.phase ?? null;
