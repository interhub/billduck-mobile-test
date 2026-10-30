import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createOperationRepository,
  OPERATION_STORAGE_KEY
} from '@/src/services/importController/operationRepository';
import {buildTestOperation} from '@/src/utils/import/__tests__/importFixtures';

const OPERATION = buildTestOperation();

describe('operationRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores the operation and the cleanup list and reads them back', async () => {
    const repository = createOperationRepository(AsyncStorage);
    const cleanup = {idempotencyKey: 'key-0000-0002', jobId: null, deleteKey: null};
    await repository.save({operation: OPERATION, pendingCleanups: [cleanup]});
    expect(await repository.load()).toEqual({
      success: true,
      payload: {operation: OPERATION, pendingCleanups: [cleanup]}
    });
  });

  it('stores nothing but the minimal operation: no file name, no payments', async () => {
    await createOperationRepository(AsyncStorage).save({operation: OPERATION, pendingCleanups: []});
    const raw = (await AsyncStorage.getItem(OPERATION_STORAGE_KEY)) ?? '';
    expect(raw).not.toMatch(/Выписка|merchant|items|StreamBeam/);
  });

  it('removes the record once nothing is left to keep', async () => {
    const repository = createOperationRepository(AsyncStorage);
    await repository.save({operation: OPERATION, pendingCleanups: []});
    await repository.save({operation: null, pendingCleanups: []});
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('drops a damaged record instead of crashing', async () => {
    await AsyncStorage.setItem(OPERATION_STORAGE_KEY, '{"operation":{"phase":"flying"}}');
    expect(await createOperationRepository(AsyncStorage).load()).toEqual({
      success: true,
      payload: {operation: null, pendingCleanups: []}
    });
  });
});
