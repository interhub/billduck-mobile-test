import AsyncStorage from '@react-native-async-storage/async-storage';
import {OPERATION_STORAGE_KEY} from '@/src/services/importController/operationRepository';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';
import {
  advance,
  importState,
  launchController,
  pickCsv,
  postRequests,
  resetWorld
} from './controllerHarness';
import {UNTIL_DELETED_MS} from './controllerWaits';
import {createFakeImportBackend} from './fakeImportBackend';
import {readyImport} from './importScenarios';

const failNextWrite = () =>
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk write failed'));

describe('import controller: a disk that refuses a write', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sends nothing and drops the draft when the operation cannot be stored before the POST', async () => {
    const backend = createFakeImportBackend();
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const logError = jest.spyOn(logger, 'e');
    failNextWrite();
    await expect(controller.send()).resolves.toBeUndefined();
    expect(postRequests(backend)).toEqual([]);
    expect(importState().operation).toBeNull();
    expect(importState().draft).toBeNull();
    expect(backend.copies.size).toBe(0);
    expect(await AsyncStorage.getItem(OPERATION_STORAGE_KEY)).toBeNull();
    expect(logError).toHaveBeenCalledWith(LOG_NAME.error_log, {
      type: LOG_TYPE.create_import,
      job_id: null,
      error_kind: ERROR_KIND.UNKNOWN,
      http_status: null
    });
    await pickCsv(controller, backend);
    expect(importState().draft?.phase).toBe('confirming');
  });

  it('says not deleted and sends no DELETE when the delete key cannot be stored', async () => {
    const {backend, controller} = await readyImport();
    failNextWrite();
    await expect(controller.deleteImport()).resolves.toBe('failed');
    const methods = backend.server.requests.map((request) => request.method);
    expect(methods).not.toContain('DELETE');
    expect(importState().operation).toMatchObject({phase: 'ready', deleteKey: null});
    const deleting = controller.deleteImport();
    await advance(UNTIL_DELETED_MS);
    expect(await deleting).toBe('deleted');
  });
});
