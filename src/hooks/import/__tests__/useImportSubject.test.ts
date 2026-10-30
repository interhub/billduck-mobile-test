import {renderHook} from '@testing-library/react-native';
import {useImportSubject} from '@/src/hooks/import/useImportSubject';
import {INITIAL_IMPORT_STATE, useImportStore} from '@/src/stores/importStore';
import {ImportOperation} from '@/src/types/importOperation';

const buildOperation = (phase: ImportOperation['phase']): ImportOperation => ({
  operationId: 'op-1',
  idempotencyKey: 'key-0000-0001',
  deleteKey: 'key-0000-0002',
  phase,
  jobId: 'job-demo-001',
  revision: 3,
  serverStatus: null,
  failure: null,
  file: {sizeBytes: 112, format: 'csv'},
  serverFileName: 'statement-20261029-1432.csv',
  createdAt: '2026-10-29T13:32:00.000Z',
  updatedAt: '2026-10-29T13:32:00.000Z'
});

describe('useImportSubject', () => {
  beforeEach(() => {
    useImportStore.setState({...INITIAL_IMPORT_STATE});
  });

  it.each(['deleted', 'gone_on_server'] as const)(
    'keeps the %s phase of a closing operation before its outcome is stored',
    async (phase) => {
      useImportStore.setState({operation: buildOperation(phase), outcome: null});
      const {result} = await renderHook(() => useImportSubject());
      expect(result.current.phase).toBe(phase);
      expect(result.current.titleSource).not.toBeNull();
    }
  );

  it('has no subject when there is no operation and no outcome', async () => {
    const {result} = await renderHook(() => useImportSubject());
    expect(result.current.phase).toBeNull();
  });
});
