import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  advance,
  crashAndRelaunch,
  importState,
  launchController,
  pickCsv,
  postRequests,
  recordStoreStates,
  resetWorld,
  timelineEvents
} from './controllerHarness';
import {
  IN_BACKGROUND_MS,
  ONE_POLL_MS,
  PAST_SILENCE_LIMIT_MS,
  THROUGH_RECOVERY_MS,
  UNTIL_READY_MS,
  UNTIL_RECONNECTING_MS,
  UNTIL_RECOVERED_MS
} from './controllerWaits';
import {createFakeImportBackend} from './fakeImportBackend';
import {queuedImport} from './importScenarios';

describe('import controller: recovery after a lost answer', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('finds the job by key after a lost_ack without any button, one job only', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    expect(importState().operation?.phase).toBe('reconnecting');
    await advance(UNTIL_RECOVERED_MS);
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
    backend.setScenario(MOCK_SCENARIO.LOST_ACK);
    const first = launchController(backend);
    await pickCsv(first.controller, backend);
    void first.controller.send();
    await advance(0);
    const second = await crashAndRelaunch(first, backend);
    const resuming = second.controller.resume();
    await advance(UNTIL_READY_MS);
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
    await advance(UNTIL_RECOVERED_MS);
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
    await advance(THROUGH_RECOVERY_MS);
    await sending;
    expect(importState().operation?.phase).toBe('server_unavailable');
    expect(backend.copies.size).toBe(1);
    backend.server.isOffline = false;
    const retrying = controller.retry();
    await advance(UNTIL_RECOVERED_MS);
    await retrying;
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats.newJobs).toBe(1);
  });

  it('waits in the background during the recovery and continues on return', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller, activity} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    activity.goBackground();
    await advance(IN_BACKGROUND_MS);
    expect(importState().operation?.phase).toBe('reconnecting');
    const lookupsInBackground = backend.server.requests.filter((request) =>
      request.path.includes('by-key')
    );
    expect(lookupsInBackground).toEqual([]);
    activity.goForeground();
    await advance(UNTIL_READY_MS);
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
    await advance(UNTIL_RECOVERED_MS);
    await sending;
    expect(importState().operation).toMatchObject({
      phase: 'failed',
      failure: {reason: 'file_missing'}
    });
    expect(importState().pendingCleanups).toHaveLength(1);
    expect(backend.server.stats).toMatchObject({newJobs: 0, createRequests: 0});
  });

  it('takes the path of an erased copy when the copy cannot be read before the repeat', async () => {
    const backend = createFakeImportBackend();
    backend.server.isOffline = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(0);
    backend.disk.isUnreadable = true;
    backend.server.isOffline = false;
    await advance(UNTIL_RECOVERED_MS);
    await sending;
    expect(importState().operation).toMatchObject({
      phase: 'failed',
      failure: {reason: 'file_missing'}
    });
    expect(importState().pendingCleanups).toHaveLength(1);
    expect(postRequests(backend)).toHaveLength(1);
    expect(backend.server.stats).toMatchObject({newJobs: 0, createRequests: 0});
  });
});

describe('import controller: polling', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows reconnecting after two silent reads, then server_unavailable after 30 seconds, and Retry resumes', async () => {
    const {backend, controller} = await queuedImport();
    backend.server.isOffline = true;
    await advance(UNTIL_RECONNECTING_MS);
    expect(importState().isPollingSilent).toBe(true);
    expect(importState().operation?.phase).toBe('queued');
    await advance(PAST_SILENCE_LIMIT_MS);
    expect(importState().operation?.phase).toBe('server_unavailable');
    backend.server.isOffline = false;
    const retrying = controller.retry();
    await advance(UNTIL_READY_MS);
    await retrying;
    expect(importState().operation?.phase).toBe('ready');
    expect(importState().isPollingSilent).toBe(false);
  });

  it('stops polling in the background and reads again on return', async () => {
    const {backend, controller, activity} = await queuedImport();
    activity.goBackground();
    await advance(ONE_POLL_MS);
    const readsInBackground = backend.server.requests.length;
    await advance(IN_BACKGROUND_MS);
    expect(backend.server.requests.length).toBe(readsInBackground);
    activity.goForeground();
    controller.onForeground();
    await advance(ONE_POLL_MS);
    expect(importState().operation?.phase).toBe('ready');
  });

  it('moves a job the server no longer knows to gone_on_server, never to deleted', async () => {
    const {backend} = await queuedImport();
    await advance(UNTIL_READY_MS);
    backend.reset();
    const {controller} = launchController(backend);
    await controller.refreshStatus();
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('gone_on_server');
  });

  it('reads a restored job only after its key was checked in this launch', async () => {
    const first = await queuedImport();
    const second = await crashAndRelaunch(first, first.backend);
    const requestsBefore = first.backend.server.requests.length;
    second.controller.onForeground();
    await advance(ONE_POLL_MS);
    const paths = first.backend.server.requests
      .slice(requestsBefore)
      .map((request) => request.path);
    expect(paths).not.toContain('/imports/job-demo-001');
  });

  it('hands a gone job over to its outcome in one update, so no screen sees an empty state', async () => {
    const {backend, controller} = await queuedImport();
    await advance(UNTIL_READY_MS);
    backend.reset();
    const recording = recordStoreStates();
    await controller.refreshStatus();
    recording.stop();
    expect(recording.states).toContain('gone_on_server / none');
    expect(recording.states).not.toContain('none / none');
    expect(recording.states.slice(-1)).toEqual(['none / gone_on_server']);
  });

  it('never takes a stranger job with the same number after a mock reset and a relaunch', async () => {
    const first = await queuedImport();
    await advance(UNTIL_READY_MS);
    first.backend.reset();
    first.backend.addStrangerJob();
    const second = await crashAndRelaunch(first, first.backend);
    await second.controller.resume();
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('gone_on_server');
    expect(first.backend.server.stats.deleteRequests).toBe(0);
  });

  it('never reads a stranger job with the same number while the app keeps running', async () => {
    const {backend, controller} = await queuedImport();
    await advance(UNTIL_READY_MS);
    expect(importState().operation).toMatchObject({phase: 'ready', jobId: 'job-demo-001'});
    backend.reset();
    const strangerJob = backend.addStrangerJob();
    const requestsBefore = backend.server.requests.length;
    await controller.refreshStatus();
    const paths = backend.server.requests.slice(requestsBefore).map((request) => request.path);
    expect(paths).not.toContain(`/imports/${strangerJob.jobId}`);
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('gone_on_server');
  });

  it('skips processing r2 after ready r3 and keeps the report', async () => {
    const {backend, controller} = await queuedImport();
    await advance(UNTIL_READY_MS);
    backend.setScenario(MOCK_SCENARIO.STALE_STATUS);
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
    const first = await queuedImport();
    const second = await crashAndRelaunch(first, first.backend);
    const resuming = second.controller.resume();
    await advance(UNTIL_READY_MS);
    await resuming;
    expect(importState().operation?.phase).toBe('ready');
    expect(importState().payments?.items).toHaveLength(2);
    expect(first.backend.server.stats.createRequests).toBe(1);
  });
});
