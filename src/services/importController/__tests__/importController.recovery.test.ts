import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  advance,
  crashAndRelaunch,
  importState,
  launchController,
  pickCsv,
  postRequests,
  resetWorld,
  timelineEvents
} from './controllerHarness';
import {createFakeImportBackend} from './fakeImportBackend';

describe('import controller: recovery after a lost answer', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('finds the job by key after a lost_ack without any button, one job only', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario('lost_ack');
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    expect(importState().operation?.phase).toBe('reconnecting');
    await advance(3000);
    await sending;
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats).toMatchObject({newJobs: 1, createRequests: 1});
    expect(timelineEvents()).toEqual(
      expect.arrayContaining([TIMELINE_EVENT.UPLOAD_ANSWER_LOST, TIMELINE_EVENT.KEY_LOOKUP_FOUND])
    );
    expect(backend.copies.size).toBe(0);
  });

  it('keeps one job when the app is restarted while the lost upload is being recovered', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario('lost_ack');
    const first = launchController(backend);
    await pickCsv(first.controller, backend);
    void first.controller.send();
    await advance(0);
    const second = await crashAndRelaunch(first, backend);
    const resuming = second.controller.resume();
    await advance(2000);
    await resuming;
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats).toMatchObject({newJobs: 1, createRequests: 1});
  });

  it('re-sends the same key and bytes when the key is not known yet, and gets the same job', async () => {
    const backend = createFakeImportBackend();
    backend.server.isOffline = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    backend.server.isOffline = false;
    await advance(3000);
    await sending;
    const keys = postRequests(backend).map((request) => request.headers['Idempotency-Key']);
    expect(new Set(keys).size).toBe(1);
    expect(timelineEvents()).toContain(TIMELINE_EVENT.RESENT_SAME_KEY);
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats.newJobs).toBe(1);
  });

  it('says the server is unavailable after three silent lookups, and "Retry" finishes the upload', async () => {
    const backend = createFakeImportBackend();
    backend.server.isOffline = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(8000);
    await sending;
    expect(importState().operation?.phase).toBe('server_unavailable');
    expect(backend.copies.size).toBe(1);
    backend.server.isOffline = false;
    const retrying = controller.retry();
    await advance(4000);
    await retrying;
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats.newJobs).toBe(1);
  });

  it('waits in the background during the recovery and continues on return', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario('lost_ack');
    const {controller, activity} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    activity.goBackground();
    await advance(10_000);
    expect(importState().operation?.phase).toBe('reconnecting');
    const lookupsInBackground = backend.server.requests.filter((request) =>
      request.path.includes('by-key')
    );
    expect(lookupsInBackground).toEqual([]);
    activity.goForeground();
    await advance(2000);
    await sending;
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats.newJobs).toBe(1);
  });

  it('says honestly that the file is gone when the copy was erased before the outcome was known', async () => {
    const backend = createFakeImportBackend();
    backend.server.isOffline = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    backend.copies.clear();
    backend.server.isOffline = false;
    await advance(3000);
    await sending;
    expect(importState().operation).toMatchObject({
      phase: 'failed',
      failure: {reason: 'file_missing'}
    });
    expect(importState().pendingCleanups).toHaveLength(1);
    expect(backend.server.stats).toMatchObject({newJobs: 0, createRequests: 0});
  });
});

describe('import controller: polling', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  const sendAndWait = async () => {
    const backend = createFakeImportBackend();
    const launched = launchController(backend);
    await pickCsv(launched.controller, backend);
    void launched.controller.send();
    await advance(0);
    return {backend, ...launched};
  };

  it('shows reconnecting after two silent reads, then server_unavailable after 30 seconds, and Retry resumes', async () => {
    const {backend, controller} = await sendAndWait();
    backend.server.isOffline = true;
    await advance(1600);
    expect(importState().isReconnecting).toBe(true);
    expect(importState().operation?.phase).toBe('queued');
    await advance(31_000);
    expect(importState().operation?.phase).toBe('server_unavailable');
    backend.server.isOffline = false;
    const retrying = controller.retry();
    await advance(1500);
    await retrying;
    expect(importState().operation?.phase).toBe('ready');
    expect(importState().isReconnecting).toBe(false);
  });

  it('stops polling in the background and reads again on return', async () => {
    const {backend, controller, activity} = await sendAndWait();
    activity.goBackground();
    await advance(600);
    const readsInBackground = backend.server.requests.length;
    await advance(10_000);
    expect(backend.server.requests.length).toBe(readsInBackground);
    activity.goForeground();
    controller.onForeground();
    await advance(600);
    expect(importState().operation?.phase).toBe('ready');
  });

  it('moves a job the server no longer knows to gone_on_server, never to deleted', async () => {
    const {backend} = await sendAndWait();
    await advance(1500);
    backend.reset();
    const {controller} = launchController(backend);
    await controller.refreshStatus();
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('gone_on_server');
  });

  it('never takes a stranger job with the same number after a mock reset and a relaunch', async () => {
    const first = await sendAndWait();
    await advance(1500);
    first.backend.reset();
    first.backend.server.byKey.set('stranger-key-0001', 'job-demo-001');
    first.backend.server.jobs.set('job-demo-001', {
      jobId: 'job-demo-001',
      key: 'stranger-key-0001',
      bytes: 'date,description,amount\n',
      createdAt: Date.now(),
      deletedAt: null
    });
    const second = await crashAndRelaunch(first, first.backend);
    await second.controller.resume();
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('gone_on_server');
    expect(first.backend.server.stats.deleteRequests).toBe(0);
  });

  it('skips processing r2 after ready r3 and keeps the report', async () => {
    const {backend, controller} = await sendAndWait();
    await advance(1500);
    backend.setScenario('stale_status');
    await controller.refreshStatus();
    await controller.refreshStatus();
    expect(importState().operation).toMatchObject({phase: 'ready', revision: 3});
    expect(importState().payments?.items).toHaveLength(2);
    expect(importState().staleSkippedCount).toBe(1);
    const stale = importState().timeline.filter(
      (entry) => entry.event === TIMELINE_EVENT.STATUS_STALE_SKIPPED
    );
    expect(stale).toEqual([expect.objectContaining({status: 'processing', revision: 2})]);
  });

  it('reads the payments again after a relaunch and polls an unfinished job without sending', async () => {
    const first = await sendAndWait();
    const second = await crashAndRelaunch(first, first.backend);
    const resuming = second.controller.resume();
    await advance(1500);
    await resuming;
    expect(importState().operation?.phase).toBe('ready');
    expect(importState().payments?.items).toHaveLength(2);
    expect(first.backend.server.stats.createRequests).toBe(1);
  });
});
