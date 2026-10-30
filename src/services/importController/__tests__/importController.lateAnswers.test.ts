import {advance, importState, pickCsv, resetWorld} from './controllerHarness';
import {UNTIL_DELETED_MS, UNTIL_REPLACED_MS} from './controllerWaits';
import {readyImport} from './importScenarios';

describe('import controller: late answers', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('drops a status answer that arrives after the import was deleted', async () => {
    const {backend, controller} = await readyImport();
    const releaseRead = backend.holdNextStatusRead();
    const refreshing = controller.refreshStatus();
    await advance(0);
    const deleting = controller.deleteImport();
    await advance(UNTIL_DELETED_MS);
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
    const releaseRead = backend.holdNextStatusRead();
    const refreshing = controller.refreshStatus();
    await advance(0);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(UNTIL_REPLACED_MS);
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
