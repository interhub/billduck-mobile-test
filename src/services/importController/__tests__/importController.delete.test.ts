import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  advance,
  crashAndRelaunch,
  importState,
  launchController,
  pickCsv,
  recordStoreStates,
  resetWorld
} from './controllerHarness';
import {UNTIL_DELETED_MS} from './controllerWaits';
import {createFakeImportBackend, FakeImportBackend} from './fakeImportBackend';
import {readyImport} from './importScenarios';

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
    await advance(UNTIL_DELETED_MS);
    expect(await deleting).toBe('deleted');
    expect(importState().operation).toBeNull();
    expect(importState().outcome?.kind).toBe('deleted');
    const deleted = importState().timeline.filter(
      (entry) => entry.event === TIMELINE_EVENT.DELETED
    );
    expect(deleted).toHaveLength(1);
  });

  it('says deleted only after a GET, even when a repeated DELETE already answers deleted', async () => {
    const {backend, controller} = await readyImport();
    const sendDelete = backend.api.deleteImport;
    backend.server.loseDeleteAnswers = true;
    backend.api.deleteImport = async (jobId, deleteKey) => {
      const answer = await sendDelete(jobId, deleteKey);
      backend.server.isOffline = true;
      return answer;
    };
    expect(await controller.deleteImport()).toBe('failed');
    backend.api.deleteImport = sendDelete;
    backend.server.loseDeleteAnswers = false;
    backend.server.isOffline = false;
    await advance(UNTIL_DELETED_MS);
    const retrying = controller.retry();
    await advance(UNTIL_DELETED_MS);
    await retrying;
    const lastDelete = backend.server.requests
      .map((request) => request.method)
      .lastIndexOf('DELETE');
    const afterDelete = backend.server.requests
      .slice(lastDelete + 1)
      .map((request) => request.path);
    expect(afterDelete).toContain('/imports/job-demo-001');
    expect(importState().outcome?.kind).toBe('deleted');
  });

  it('keeps an asked deletion after a restart with a silent server: the report never comes back', async () => {
    const first = await readyImport();
    first.backend.server.isOffline = true;
    expect(await first.controller.deleteImport()).toBe('failed');
    const second = await crashAndRelaunch(first, first.backend);
    await second.controller.resume();
    expect(importState().operation?.phase).toBe('server_unavailable');
    first.backend.server.isOffline = false;
    await second.controller.retry();
    expect(importState().operation?.phase).toBe('delete_failed');
    expect(first.backend.server.stats.deleteRequests).toBe(0);
    const deleting = second.controller.retry();
    await advance(UNTIL_DELETED_MS);
    await deleting;
    expect(importState().outcome?.kind).toBe('deleted');
  });

  it('hands a deleted import over to its outcome in one update, so no screen sees an empty state', async () => {
    const {controller} = await readyImport();
    const recording = recordStoreStates();
    const deleting = controller.deleteImport();
    await advance(UNTIL_DELETED_MS);
    await deleting;
    recording.stop();
    expect(recording.states).toContain('deleted / none');
    expect(recording.states).not.toContain('none / none');
    expect(recording.states.slice(-1)).toEqual(['none / deleted']);
  });

  it('never says deleted on a 503, and Retry with the same delete key reaches deleted', async () => {
    const {backend, controller} = await readyImport();
    backend.setScenario(MOCK_SCENARIO.DELETE_FAILURE);
    expect(await controller.deleteImport()).toBe('failed');
    expect(importState().operation?.phase).toBe('delete_failed');
    expect(importState().outcome).toBeNull();
    backend.setScenario(MOCK_SCENARIO.HAPPY);
    const retrying = controller.retry();
    await advance(UNTIL_DELETED_MS);
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
    await advance(UNTIL_DELETED_MS);
    await retrying;
    expect(deleteRequests(backend)).toHaveLength(1);
    expect(importState().outcome?.kind).toBe('deleted');
  });

  it('checks the job when the DELETE arrived but its answer was lost, and waits for deleted', async () => {
    const {backend, controller} = await readyImport();
    backend.server.loseDeleteAnswers = true;
    const deleting = controller.deleteImport();
    await advance(UNTIL_DELETED_MS);
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
    await advance(UNTIL_DELETED_MS);
    expect(await cancelling).toBe('deleted');
    expect(importState().operation).toBeNull();
  });
});
