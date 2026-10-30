import {advance, importState, launchController, pickCsv, resetWorld} from './controllerHarness';
import {createFakeImportBackend} from './fakeImportBackend';

describe('import controller: cleanups in the background', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the foreground before it reads a cancelled upload again', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario('lost_ack');
    const {controller, activity} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(0);
    backend.server.isOffline = true;
    await advance(8000);
    await controller.cancelUpload();
    backend.server.isOffline = false;
    backend.setScenario('happy');
    const cleaning = controller.runCleanups();
    await advance(0);
    activity.goBackground();
    const requestsInForeground = backend.server.requests.length;
    await advance(10_000);
    expect(backend.server.requests).toHaveLength(requestsInForeground);
    activity.goForeground();
    await advance(2000);
    await cleaning;
    expect(importState().pendingCleanups).toEqual([]);
    expect(backend.server.jobs.get('job-demo-001')?.deletedAt).not.toBeNull();
  });
});
