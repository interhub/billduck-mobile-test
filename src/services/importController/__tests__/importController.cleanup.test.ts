import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  advance,
  importState,
  launchController,
  pickCsv,
  resetWorld,
  timelineEvents
} from './controllerHarness';
import {
  IN_BACKGROUND_MS,
  PAST_CLEANUP_RECHECK_MS,
  THROUGH_RECOVERY_MS,
  UNTIL_CLEANED_UP_MS,
  UNTIL_FIRST_LOOKUP_MS
} from './controllerWaits';
import {createFakeImportBackend} from './fakeImportBackend';

describe('import controller: cleanups in the background', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the foreground before it reads a cancelled upload again', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller, activity} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(0);
    backend.server.isOffline = true;
    await advance(THROUGH_RECOVERY_MS);
    await controller.cancelUpload();
    backend.server.isOffline = false;
    backend.setScenario(MOCK_SCENARIO.HAPPY);
    const cleaning = controller.runCleanups();
    await advance(0);
    activity.goBackground();
    const requestsInForeground = backend.server.requests.length;
    await advance(IN_BACKGROUND_MS);
    expect(backend.server.requests).toHaveLength(requestsInForeground);
    activity.goForeground();
    await advance(UNTIL_CLEANED_UP_MS);
    await cleaning;
    expect(importState().pendingCleanups).toEqual([]);
    expect(backend.server.jobs.get('job-demo-001')?.deletedAt).not.toBeNull();
  });
});

describe('import controller: cancel with cleanup and late answers', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes a cancelled upload on the server once the server answers again', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(0);
    backend.server.isOffline = true;
    await advance(THROUGH_RECOVERY_MS);
    expect(importState().operation?.phase).toBe('server_unavailable');
    await controller.cancelUpload();
    expect(importState().operation).toBeNull();
    expect(importState().pendingCleanups).toHaveLength(1);
    expect(backend.copies.size).toBe(0);
    backend.server.isOffline = false;
    backend.setScenario(MOCK_SCENARIO.HAPPY);
    const cleaning = controller.runCleanups();
    await advance(UNTIL_CLEANED_UP_MS);
    await cleaning;
    expect(importState().pendingCleanups).toEqual([]);
    expect(backend.server.jobs.get('job-demo-001')?.deletedAt).not.toBeNull();
    expect(timelineEvents()).toContain(TIMELINE_EVENT.CLEANUP_DELETED);
  });

  it('forgets a cancelled upload that never reached the server after one more look', async () => {
    const backend = createFakeImportBackend();
    backend.server.isOffline = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(THROUGH_RECOVERY_MS);
    await controller.cancelUpload();
    backend.server.isOffline = false;
    const cleaning = controller.runCleanups();
    await advance(PAST_CLEANUP_RECHECK_MS);
    await cleaning;
    expect(importState().pendingCleanups).toEqual([]);
    expect(backend.server.stats.newJobs).toBe(0);
  });

  it('drops the answer of an upload cancelled while it was in flight', async () => {
    const backend = createFakeImportBackend();
    backend.server.isOffline = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(THROUGH_RECOVERY_MS);
    backend.server.isOffline = false;
    backend.server.holdUploads = true;
    void controller.retry();
    await advance(UNTIL_FIRST_LOOKUP_MS);
    await advance(0);
    await controller.cancelUpload();
    backend.releaseUploads();
    await advance(0);
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('upload_cancelled');
  });
});
