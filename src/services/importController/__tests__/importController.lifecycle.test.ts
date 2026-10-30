import AsyncStorage from '@react-native-async-storage/async-storage';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {OPERATION_STORAGE_KEY} from '@/src/services/importController/operationRepository';
import {INITIAL_IMPORT_STATE} from '@/src/stores/importStore';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {
  advance,
  crashAndRelaunch,
  importState,
  launchController,
  pickCsv,
  resetWorld,
  timelineEvents
} from './controllerHarness';
import {PAST_CLEANUP_RECHECK_MS, THROUGH_RECOVERY_MS, UNTIL_READY_MS} from './controllerWaits';
import {createFakeImportBackend} from './fakeImportBackend';

/** The store of a launch that holds nothing: restored, with no operation, draft or journal. */
const EMPTY_RESTORED_STATE = {...INITIAL_IMPORT_STATE, isRestored: true};

const storedRecord = () => AsyncStorage.getItem(OPERATION_STORAGE_KEY);

/** An upload the server never answered: the operation and its copy wait on the disk. */
const unansweredUpload = async () => {
  const backend = createFakeImportBackend();
  backend.server.isOffline = true;
  const launched = launchController(backend);
  await pickCsv(launched.controller, backend);
  const sending = launched.controller.send();
  await advance(THROUGH_RECOVERY_MS);
  await sending;
  return {backend, ...launched};
};

describe('import controller: reset all', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('forgets the stored operation, the draft, the copies and the journal without asking the server', async () => {
    const backend = createFakeImportBackend();
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(UNTIL_READY_MS);
    await sending;
    await pickCsv(controller, backend);
    expect(importState().operation?.phase).toBe('ready');
    expect(importState().draft?.phase).toBe('confirming');
    expect(backend.copies.size).toBe(1);
    const requestsBefore = backend.server.requests.length;
    await controller.forgetEverything();
    expect(importState()).toEqual(EMPTY_RESTORED_STATE);
    expect(await storedRecord()).toBeNull();
    expect(backend.copies.size).toBe(0);
    expect(backend.server.requests).toHaveLength(requestsBefore);
    expect(backend.server.jobs.get('job-demo-001')?.deletedAt).toBeNull();
  });

  it('aborts a running upload and drops its late answer without a recovery', async () => {
    const backend = createFakeImportBackend();
    const uploadSignals: (AbortSignal | undefined)[] = [];
    const createImport = backend.api.createImport;
    backend.api.createImport = async (request) => {
      uploadSignals.push(request.signal);
      return createImport(request);
    };
    backend.server.holdUploads = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    expect(importState().operation?.phase).toBe('uploading');
    await controller.forgetEverything();
    expect(uploadSignals).toHaveLength(1);
    expect(uploadSignals[0]?.aborted).toBe(true);
    expect(importState()).toEqual(EMPTY_RESTORED_STATE);
    expect(await storedRecord()).toBeNull();
    expect(backend.copies.size).toBe(0);
    backend.releaseUploads();
    await advance(THROUGH_RECOVERY_MS);
    await sending;
    expect(importState().operation).toBeNull();
    expect(importState().outcome).toBeNull();
    expect(timelineEvents()).toEqual([TIMELINE_EVENT.LATE_ANSWER_DROPPED]);
    expect(backend.server.requests.map((request) => request.method)).toEqual(['POST']);
    expect(await storedRecord()).toBeNull();
  });

  it('drops the pending cleanups, so no later pass asks the server about them', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(0);
    backend.server.isOffline = true;
    await advance(THROUGH_RECOVERY_MS);
    await controller.cancelUpload();
    await advance(0);
    expect(importState().pendingCleanups).toHaveLength(1);
    await controller.forgetEverything();
    expect(importState()).toEqual(EMPTY_RESTORED_STATE);
    expect(await storedRecord()).toBeNull();
    backend.server.isOffline = false;
    backend.setScenario(MOCK_SCENARIO.HAPPY);
    const requestsBefore = backend.server.requests.length;
    const cleaning = controller.runCleanups();
    await advance(PAST_CLEANUP_RECHECK_MS);
    await cleaning;
    expect(backend.server.requests).toHaveLength(requestsBefore);
    expect(backend.server.jobs.get('job-demo-001')?.deletedAt).toBeNull();
  });
});

describe('import controller: restore at launch', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ends the launch restored and empty, logging only the error kind, when the disk cannot be read', async () => {
    const first = await unansweredUpload();
    const logError = jest.spyOn(logger, 'e');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk read failed'));
    const second = await crashAndRelaunch(first, first.backend);
    expect(importState()).toEqual(EMPTY_RESTORED_STATE);
    expect(logError).toHaveBeenCalledWith(LOG_NAME.error_log, {
      type: LOG_TYPE.restore_operation,
      error_kind: ERROR_KIND.UNKNOWN,
      http_status: null
    });
    const requestsBefore = first.backend.server.requests.length;
    await second.controller.resume();
    expect(first.backend.server.requests).toHaveLength(requestsBefore);
  });

  it('keeps the stored operation and its copy for the next launch when the disk cannot be read', async () => {
    const first = await unansweredUpload();
    expect(first.backend.copies.size).toBe(1);
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk read failed'));
    const second = await crashAndRelaunch(first, first.backend);
    expect(await storedRecord()).not.toBeNull();
    expect(first.backend.copies.size).toBe(1);
    await crashAndRelaunch(second, first.backend);
    expect(importState().operation?.phase).toBe('server_unavailable');
    expect(first.backend.copies.size).toBe(1);
  });
});
