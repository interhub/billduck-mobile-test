import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createOperationRepository,
  OPERATION_STORAGE_KEY
} from '@/src/services/importController/operationRepository';
import {ImportOperation} from '@/src/types/importOperation';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

const OPERATION: ImportOperation = {
  operationId: 'op-1',
  idempotencyKey: 'key-0000-0001',
  deleteKey: 'key-0000-0003',
  phase: 'failed',
  jobId: 'job-demo-001',
  revision: 1,
  serverStatus: null,
  failure: {reason: 'server_rejected', httpStatus: 403},
  file: {sizeBytes: 112, format: 'csv'},
  serverFileName: 'statement-20261029-1432.csv',
  createdAt: '2026-10-29T13:32:00.000Z',
  updatedAt: '2026-10-29T13:32:00.000Z'
};

const EMPTY_LOAD = {success: true, payload: {operation: null, pendingCleanups: []}};

const storeRaw = (record: object) =>
  AsyncStorage.setItem(OPERATION_STORAGE_KEY, JSON.stringify(record));

describe('operationRepository: storage failures', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the failure of a read instead of throwing', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk read failed'));
    expect(await createOperationRepository(AsyncStorage).load()).toEqual({
      success: false,
      error: {kind: ERROR_KIND.UNKNOWN, httpStatus: null}
    });
  });

  it('returns the failure of a write instead of throwing, and the old record stays', async () => {
    const repository = createOperationRepository(AsyncStorage);
    await repository.save({operation: OPERATION, pendingCleanups: []});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk write failed'));
    const saved = await repository.save({
      operation: {...OPERATION, phase: 'deleting'},
      pendingCleanups: []
    });
    expect(saved).toEqual({success: false, error: {kind: ERROR_KIND.UNKNOWN, httpStatus: null}});
    expect(await repository.load()).toEqual({
      success: true,
      payload: {operation: OPERATION, pendingCleanups: []}
    });
  });
});

describe('operationRepository: the guard of a stored record', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('reads back every field of a stored operation and cleanup', async () => {
    const cleanup = {idempotencyKey: 'key-0000-0002', jobId: 'job-demo-002', deleteKey: 'k-4'};
    await storeRaw({operation: OPERATION, pendingCleanups: [cleanup]});
    expect(await createOperationRepository(AsyncStorage).load()).toEqual({
      success: true,
      payload: {operation: OPERATION, pendingCleanups: [cleanup]}
    });
  });

  it.each([
    ['a job id that is not text', {jobId: 7}],
    ['a delete key that is not text', {deleteKey: {}}],
    ['a status the server never sends', {serverStatus: 'flying'}],
    ['a failure of an unknown kind', {failure: {reason: 'tired'}}],
    ['a refusal without its HTTP status', {failure: {reason: 'server_rejected'}}],
    ['no update time', {updatedAt: undefined}]
  ])('drops an operation with %s', async (_name, damage) => {
    await storeRaw({operation: {...OPERATION, ...damage}, pendingCleanups: []});
    expect(await createOperationRepository(AsyncStorage).load()).toEqual(EMPTY_LOAD);
    expect(await AsyncStorage.getItem(OPERATION_STORAGE_KEY)).toBeNull();
  });

  it('drops a cleanup entry whose delete key is not text', async () => {
    const cleanup = {idempotencyKey: 'key-0000-0002', jobId: null, deleteKey: 42};
    await storeRaw({operation: null, pendingCleanups: [cleanup]});
    expect(await createOperationRepository(AsyncStorage).load()).toEqual(EMPTY_LOAD);
  });
});
