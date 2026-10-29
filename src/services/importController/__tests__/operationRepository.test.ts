import AsyncStorage from '@react-native-async-storage/async-storage';
import {createOperationRepository} from '@/src/services/importController/operationRepository';
import {ImportOperation} from '@/src/types/importOperation';

const OPERATION: ImportOperation = {
  operationId: 'op-1',
  idempotencyKey: 'key-0000-0001',
  deleteKey: null,
  phase: 'uploading',
  jobId: null,
  revision: 0,
  serverStatus: null,
  failure: null,
  file: {sizeBytes: 112, format: 'csv'},
  serverFileName: 'statement-20261029-1432.csv',
  createdAt: '2026-10-29T13:32:00.000Z',
  updatedAt: '2026-10-29T13:32:00.000Z'
};

describe('operationRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores the operation and the cleanup list and reads them back', async () => {
    const repository = createOperationRepository(AsyncStorage);
    const cleanup = {idempotencyKey: 'key-0000-0002', jobId: null, deleteKey: null};
    await repository.save({operation: OPERATION, pendingCleanups: [cleanup]});
    expect(await repository.load()).toEqual({operation: OPERATION, pendingCleanups: [cleanup]});
  });

  it('stores nothing but the minimal operation: no file name, no payments', async () => {
    await createOperationRepository(AsyncStorage).save({operation: OPERATION, pendingCleanups: []});
    const raw = (await AsyncStorage.getItem('billduck.import_operation.v1')) ?? '';
    expect(raw).not.toMatch(/Выписка|merchant|items|StreamBeam/);
  });

  it('removes the record once nothing is left to keep', async () => {
    const repository = createOperationRepository(AsyncStorage);
    await repository.save({operation: OPERATION, pendingCleanups: []});
    await repository.save({operation: null, pendingCleanups: []});
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('drops a damaged record instead of crashing', async () => {
    await AsyncStorage.setItem('billduck.import_operation.v1', '{"operation":{"phase":"flying"}}');
    expect(await createOperationRepository(AsyncStorage).load()).toEqual({
      operation: null,
      pendingCleanups: []
    });
  });
});
