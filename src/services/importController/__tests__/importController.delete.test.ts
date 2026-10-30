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
import {createFakeImportBackend, FakeImportBackend} from './fakeImportBackend';

const readyImport = async () => {
  const backend = createFakeImportBackend();
  const launched = launchController(backend);
  await pickCsv(launched.controller, backend);
  const sending = launched.controller.send();
  await advance(1500);
  await sending;
  return {backend, ...launched};
};

const deleteRequests = (backend: FakeImportBackend) =>
  backend.server.requests.filter((request) => request.method === 'DELETE');

describe('import controller: deleting', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('says deleted only after a GET returns deleted', async () => {
    const {controller} = await readyImport();
    const deleting = controller.deleteImport();
    await advance(0);
    expect(importState().operation?.phase).toBe('deleting');
    expect(importState().outcome).toBeNull();
    await advance(1500);
    expect(await deleting).toBe('deleted');
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('deleted');
    const deleted = importState().timeline.filter(
      (entry) => entry.event === TIMELINE_EVENT.DELETED
    );
    expect(deleted).toHaveLength(1);
  });

  it('hands a deleted import over to its outcome in one update, so no screen sees an empty state', async () => {
    const {controller} = await readyImport();
    const recording = recordStoreStates();
    const deleting = controller.deleteImport();
    await advance(1500);
    await deleting;
    recording.stop();
    expect(recording.states).toContain('deleted / none');
    expect(recording.states).not.toContain('none / none');
    expect(recording.states.slice(-1)).toEqual(['none / deleted']);
  });

  it('never says deleted on a 503, and Retry with the same delete key reaches deleted', async () => {
    const {backend, controller} = await readyImport();
    backend.setScenario('delete_failure');
    expect(await controller.deleteImport()).toBe('failed');
    expect(importState().operation?.phase).toBe('delete_failed');
    expect(importState().outcome).toBeNull();
    backend.setScenario('happy');
    const retrying = controller.retry();
    await advance(1500);
    await retrying;
    const keys = deleteRequests(backend).map((request) => request.headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
    expect(importState().outcome?.kind).toBe('deleted');
  });

  it('says not deleted when the server is silent before the DELETE, and Retry deletes', async () => {
    const {backend, controller} = await readyImport();
    backend.server.isOffline = true;
    expect(await controller.deleteImport()).toBe('failed');
    expect(importState().operation?.phase).toBe('delete_failed');
    expect(importState().outcome).toBeNull();
    expect(deleteRequests(backend)).toHaveLength(0);
    backend.server.isOffline = false;
    const retrying = controller.retry();
    await advance(1500);
    await retrying;
    expect(deleteRequests(backend)).toHaveLength(1);
    expect(importState().outcome?.kind).toBe('deleted');
  });

  it('checks the job when the DELETE arrived but its answer was lost, and waits for deleted', async () => {
    const {backend, controller} = await readyImport();
    backend.server.loseDeleteAnswers = true;
    const deleting = controller.deleteImport();
    await advance(1500);
    expect(await deleting).toBe('deleted');
    expect(deleteRequests(backend)).toHaveLength(1);
    expect(importState().outcome?.kind).toBe('deleted');
  });

  it('never deletes a stranger job that took the same number after a mock reset', async () => {
    const {backend, controller} = await readyImport();
    backend.reset();
    const strangerJob = backend.addStrangerJob();
    expect(await controller.deleteImport()).toBe('gone');
    expect(deleteRequests(backend)).toHaveLength(0);
    expect(strangerJob.deletedAt).toBeNull();
    expect(importState().outcome?.kind).toBe('gone_on_server');
  });

  it('marks a stored deletion that never reached the server as not deleted after a relaunch', async () => {
    const first = await readyImport();
    first.backend.server.isOffline = true;
    void first.controller.deleteImport();
    await advance(0);
    first.backend.server.isOffline = false;
    const second = await crashAndRelaunch(first, first.backend);
    await second.controller.resume();
    expect(importState().operation?.phase).toBe('delete_failed');
  });

  it('cancels a queued import through the same deletion', async () => {
    const backend = createFakeImportBackend();
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(0);
    const cancelling = controller.deleteImport();
    await advance(1500);
    expect(await cancelling).toBe('deleted');
    expect(importState().operation).toBeNull();
  });
});

describe('import controller: replacing the previous statement', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes the previous statement before sending the new one', async () => {
    const {backend, controller} = await readyImport();
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(4000);
    await sending;
    expect(importState().operation).toMatchObject({phase: 'ready', jobId: 'job-demo-002'});
    expect(backend.server.stats).toMatchObject({newJobs: 2, deleteRequests: 1});
    expect(importState().timeline.some((entry) => entry.aboutPrevious)).toBe(true);
  });

  it('does not send the new statement while the old one fails to delete', async () => {
    const {backend, controller} = await readyImport();
    backend.setScenario('delete_failure');
    await pickCsv(controller, backend);
    await controller.send();
    expect(importState().draft).toMatchObject({
      phase: 'replacing_previous',
      isReplacementBlocked: true
    });
    expect(postRequests(backend)).toHaveLength(1);
    backend.setScenario('happy');
    const retrying = controller.retry();
    await advance(3000);
    await retrying;
    expect(importState().draft).toBeNull();
    expect(importState().operation).toMatchObject({phase: 'ready', jobId: 'job-demo-002'});
  });
});

describe('import controller: cancel with cleanup and late answers', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes a cancelled upload on the server once the server answers again', async () => {
    const backend = createFakeImportBackend();
    backend.setScenario('lost_ack');
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    void controller.send();
    await advance(0);
    backend.server.isOffline = true;
    await advance(8000);
    expect(importState().operation?.phase).toBe('server_unavailable');
    await controller.cancelUpload();
    expect(importState().operation).toBeNull();
    expect(importState().pendingCleanups).toHaveLength(1);
    expect(backend.copies.size).toBe(0);
    backend.server.isOffline = false;
    backend.setScenario('happy');
    const cleaning = controller.runCleanups();
    await advance(2000);
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
    await advance(8000);
    await controller.cancelUpload();
    backend.server.isOffline = false;
    const cleaning = controller.runCleanups();
    await advance(6000);
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
    await advance(8000);
    backend.server.isOffline = false;
    backend.server.holdUploads = true;
    void controller.retry();
    await advance(1000);
    await advance(0);
    await controller.cancelUpload();
    backend.releaseUploads();
    await advance(0);
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('upload_cancelled');
  });
});
