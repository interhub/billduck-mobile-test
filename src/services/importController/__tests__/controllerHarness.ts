import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createImportController,
  ImportController
} from '@/src/services/importController/createImportController';
import {AppActivity} from '@/src/services/importController/importControllerTypes';
import {createOperationRepository} from '@/src/services/importController/operationRepository';
import {INITIAL_IMPORT_STATE, useImportStore} from '@/src/stores/importStore';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {wait} from '@/src/utils/promise/wait';
import {CSV_STATEMENT, FakeImportBackend} from './fakeImportBackend';

export const START_TIME = new Date(2026, 9, 29, 14, 32);

type ActivityHandle = {
  activity: AppActivity;
  goBackground: () => void;
  goForeground: () => void;
};

/** The foreground state of one "process"; a crashed process stays in the background forever. */
export const createActivity = (): ActivityHandle => {
  const state = {isActive: true, waiters: [] as (() => void)[]};
  return {
    activity: {
      isActive: () => state.isActive,
      whenActive: () => {
        if (state.isActive) {
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
          state.waiters.push(resolve);
        });
      }
    },
    goBackground: () => {
      state.isActive = false;
    },
    goForeground: () => {
      state.isActive = true;
      for (const resolve of state.waiters.splice(0)) {
        resolve();
      }
    }
  };
};

/** Readable, unique keys of 12 characters, inside the 8-128 the server accepts. */
export const createKeyFactory = () => {
  const counter = {value: 0};
  return () => {
    counter.value += 1;
    return `key-${String(counter.value).padStart(8, '0')}`;
  };
};

export type LaunchedController = {
  controller: ImportController;
  activity: ActivityHandle;
};

/** One app process: a controller on the shared AsyncStorage and the shared store. */
export const launchController = (
  backend: FakeImportBackend,
  createKey = createKeyFactory()
): LaunchedController => {
  const activity = createActivity();
  const controller = createImportController({
    api: backend.api,
    repository: createOperationRepository(AsyncStorage),
    files: backend.files,
    store: useImportStore,
    activity: activity.activity,
    createKey,
    now: () => new Date(),
    wait
  });
  return {controller, activity};
};

/**
 * A crash: the old process never runs again, the memory is gone, the disk and the private
 * copies stay. The new process reads the disk and resumes.
 */
export const crashAndRelaunch = async (
  crashed: LaunchedController,
  backend: FakeImportBackend,
  createKey = createKeyFactory()
): Promise<LaunchedController> => {
  crashed.activity.goBackground();
  useImportStore.setState({...INITIAL_IMPORT_STATE});
  const relaunched = launchController(backend, createKey);
  await relaunched.controller.restore();
  return relaunched;
};

export const resetWorld = async () => {
  jest.useFakeTimers({now: START_TIME});
  await AsyncStorage.clear();
  useImportStore.setState({...INITIAL_IMPORT_STATE});
};

export const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

export const pickCsv = async (controller: ImportController, backend: FakeImportBackend) => {
  backend.queuePick({
    kind: 'file',
    name: 'statement.csv',
    mimeType: 'text/csv',
    content: CSV_STATEMENT
  });
  await controller.pickFile();
};

export const importState = () => useImportStore.getState();

export const timelineEvents = (): TIMELINE_EVENT[] =>
  importState().timeline.map((entry) => entry.event);

export const postRequests = (backend: FakeImportBackend) =>
  backend.server.requests.filter((request) => request.method === 'POST');
