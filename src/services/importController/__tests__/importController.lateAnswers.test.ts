import {advance, importState, pickCsv, resetWorld} from './controllerHarness';
import {FakeImportBackend} from './fakeImportBackend';
import {readyImport} from './importScenarios';

/** The next status read gets its answer now, but hands it over only when the test says so. */
const holdNextStatusRead = (backend: FakeImportBackend) => {
  const gate = Promise.withResolvers<void>();
  const getImport = backend.api.getImport;
  backend.api.getImport = async (jobId) => {
    backend.api.getImport = getImport;
    const answer = await getImport(jobId);
    await gate.promise;
    return answer;
  };
  return gate.resolve;
};

describe('import controller: late answers', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('drops a status answer that arrives after the import was deleted', async () => {
    const {backend, controller} = await readyImport();
    const releaseRead = holdNextStatusRead(backend);
    const refreshing = controller.refreshStatus();
    await advance(0);
    const deleting = controller.deleteImport();
    await advance(1500);
    expect(await deleting).toBe('deleted');
    const afterDeletion = importState();
    releaseRead();
    await refreshing;
    expect(importState().operation).toBeNull();
    expect(importState().payments).toBeNull();
    expect(importState().outcome?.kind).toBe('deleted');
    expect(importState().timeline).toEqual(afterDeletion.timeline);
  });

  it('drops a status answer of the previous statement that arrives after the new one was sent', async () => {
    const {backend, controller} = await readyImport();
    const releaseRead = holdNextStatusRead(backend);
    const refreshing = controller.refreshStatus();
    await advance(0);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(4000);
    await sending;
    const afterReplacement = importState();
    expect(afterReplacement.operation).toMatchObject({phase: 'ready', jobId: 'job-demo-002'});
    releaseRead();
    await refreshing;
    expect(importState().operation).toEqual(afterReplacement.operation);
    expect(importState().payments).toEqual(afterReplacement.payments);
    expect(importState().timeline).toEqual(afterReplacement.timeline);
  });
});
