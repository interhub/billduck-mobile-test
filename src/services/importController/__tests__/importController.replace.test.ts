import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {
  advance,
  importState,
  launchController,
  pickCsv,
  postRequests,
  resetWorld
} from './controllerHarness';
import {ONE_POLL_MS, UNTIL_REPLACED_MS} from './controllerWaits';
import {createFakeImportBackend} from './fakeImportBackend';
import {readyImport} from './importScenarios';

describe('import controller: replacing the previous statement', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes the previous statement before sending the new one', async () => {
    const {backend, controller} = await readyImport();
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(UNTIL_REPLACED_MS);
    await sending;
    expect(importState().operation).toMatchObject({phase: 'ready', jobId: 'job-demo-002'});
    expect(backend.server.stats).toMatchObject({newJobs: 2, deleteRequests: 1});
    expect(importState().timeline.some((entry) => entry.aboutPrevious)).toBe(true);
  });

  it('deletes a failed import that already has a job before the new statement goes out', async () => {
    const backend = createFakeImportBackend();
    backend.server.refusedReadStatus = 403;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(ONE_POLL_MS);
    await sending;
    expect(importState().operation).toMatchObject({phase: 'failed', jobId: 'job-demo-001'});
    backend.server.refusedReadStatus = null;
    await pickCsv(controller, backend);
    const replacing = controller.send();
    await advance(UNTIL_REPLACED_MS);
    await replacing;
    const calls = backend.server.requests.map((request) => `${request.method} ${request.path}`);
    expect(calls).toContain('DELETE /imports/job-demo-001');
    expect(calls.indexOf('DELETE /imports/job-demo-001')).toBeLessThan(
      calls.lastIndexOf('POST /imports')
    );
    expect(importState().operation).toMatchObject({phase: 'ready', jobId: 'job-demo-002'});
  });

  it('does not send the new statement while the old one fails to delete', async () => {
    const {backend, controller} = await readyImport();
    backend.setScenario(MOCK_SCENARIO.DELETE_FAILURE);
    await pickCsv(controller, backend);
    await controller.send();
    expect(importState().draft).toMatchObject({
      phase: 'replacing_previous',
      isReplacementBlocked: true
    });
    expect(postRequests(backend)).toHaveLength(1);
    backend.setScenario(MOCK_SCENARIO.HAPPY);
    const retrying = controller.retry();
    await advance(UNTIL_REPLACED_MS);
    await retrying;
    expect(importState().draft).toBeNull();
    expect(importState().operation).toMatchObject({phase: 'ready', jobId: 'job-demo-002'});
  });
});
