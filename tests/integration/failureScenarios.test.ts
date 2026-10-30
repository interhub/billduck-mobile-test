import path from 'node:path';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {useImportStore} from '@/src/stores/importStore';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  createPhone,
  disposePhones,
  FIXTURES,
  importPhase,
  readCounters,
  readMockState,
  relaunch,
  resetMock,
  startScenario,
  switchScenario,
  waitForImport,
  waitForPhase
} from '@/tests/integration/support/importTestEnvironment';
import {
  createNodeImportsApi,
  installRequestRecorder,
  network
} from '@/tests/integration/support/nodeNetwork';

installRequestRecorder();
afterEach(disposePhones);

const events = () => useImportStore.getState().timeline.map((entry) => entry.event);

/** Another client's upload, made straight through the API client. */
const uploadDirectly = async (fixture: string, idempotencyKey: string): Promise<string | null> => {
  const result = await createNodeImportsApi().createImport({
    fileUri: path.join(FIXTURES, fixture),
    idempotencyKey,
    serverFileName: 'statement-20261029-1432.pdf'
  });
  if (!result.success) {
    return null;
  }
  return result.payload.jobId;
};

describe('lost_ack', () => {
  it('recovers the job by key with no button and creates one job', async () => {
    await startScenario(MOCK_SCENARIO.LOST_ACK);
    const app = createPhone().launch();
    await app.sendFixture('statement.csv');
    await waitForPhase('reconnecting');
    await waitForPhase('ready');
    expect(events()).toEqual(
      expect.arrayContaining([TIMELINE_EVENT.UPLOAD_ANSWER_LOST, TIMELINE_EVENT.KEY_LOOKUP_FOUND])
    );
    expect(await readCounters()).toMatchObject({newJobs: 1, createRequests: 1});
  });

  it('keeps one job when the app is restarted before the recovery', async () => {
    await startScenario(MOCK_SCENARIO.LOST_ACK);
    const phone = createPhone();
    const first = phone.launch();
    await first.sendFixture('statement.csv');
    await waitForPhase('reconnecting');
    const second = await relaunch(phone, first);
    await second.controller.resume();
    await waitForPhase('ready');
    expect(events()).toContain(TIMELINE_EVENT.APP_RESTARTED);
    expect(await readCounters()).toMatchObject({newJobs: 1, createRequests: 1});
  });

  it('answers a repeated POST with the same key and bytes with the same job and a duplicate hit', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const api = createNodeImportsApi();
    const request = {
      fileUri: path.join(FIXTURES, 'statement.csv'),
      idempotencyKey: `repeat-${Date.now()}`,
      serverFileName: 'statement-20261029-1432.csv'
    };
    const first = await api.createImport(request);
    const second = await api.createImport(request);
    expect(first.success && second.success && first.payload.jobId === second.payload.jobId).toBe(
      true
    );
    expect(await readCounters()).toMatchObject({newJobs: 1, duplicateHits: 1});
  });
});

describe('stale_status', () => {
  it('skips processing r2 after ready r3 and keeps the report', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const app = createPhone().launch();
    await app.sendFixture('statement.csv');
    await waitForPhase('ready');
    await switchScenario(MOCK_SCENARIO.STALE_STATUS);
    await app.controller.refreshStatus();
    await app.controller.refreshStatus();
    const state = useImportStore.getState();
    expect(state.operation).toMatchObject({phase: 'ready', revision: 3});
    expect(state.payments?.items).toHaveLength(2);
    expect(state.timeline).toContainEqual(
      expect.objectContaining({
        event: TIMELINE_EVENT.STATUS_STALE_SKIPPED,
        status: 'processing',
        revision: 2
      })
    );
  });
});

describe('delete_failure', () => {
  it('stays honest on a 503 and reaches deleted with the same key after happy', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const app = createPhone().launch();
    await app.sendFixture('statement.csv');
    await waitForPhase('ready');
    await switchScenario(MOCK_SCENARIO.DELETE_FAILURE);
    expect(await app.controller.deleteImport()).toBe('failed');
    expect(importPhase()).toBe('delete_failed');
    expect(useImportStore.getState().outcome).toBeNull();
    await switchScenario(MOCK_SCENARIO.HAPPY);
    void app.controller.retry();
    await waitForImport((state) => state.outcome?.kind === 'deleted');
    const deleteKeys = network.recorded
      .filter((request) => request.method === 'DELETE')
      .map((request) => request.headers['idempotency-key']);
    expect(deleteKeys).toHaveLength(2);
    expect(new Set(deleteKeys).size).toBe(1);
    expect(await readCounters()).toMatchObject({deleteRequests: 2});
  });
});

describe('a reset mock and a stopped mock', () => {
  it('moves a job the server forgot to gone_on_server and never takes the new job with the same number', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const phone = createPhone();
    const first = phone.launch();
    await first.sendFixture('statement.csv');
    await waitForPhase('ready');
    await resetMock();
    const strangerJob = await uploadDirectly('statement.pdf', `stranger-${Date.now()}`);
    expect(strangerJob).toBe('job-demo-001');
    const relaunched = await relaunch(phone, first);
    await relaunched.controller.resume();
    expect(useImportStore.getState().operation).toBeNull();
    expect(useImportStore.getState().outcome?.kind).toBe('gone_on_server');
    expect((await readCounters()).deleteRequests).toBe(0);
  });

  it('deletes a cancelled upload once the server answers again, if it got there', async () => {
    await startScenario(MOCK_SCENARIO.LOST_ACK);
    const phone = createPhone();
    const app = phone.launch();
    await app.sendFixture('statement.csv');
    await waitForPhase('reconnecting');
    network.isOffline = true;
    await waitForPhase('server_unavailable');
    await app.controller.cancelUpload();
    expect(useImportStore.getState().pendingCleanups).toHaveLength(1);
    expect(phone.listCopies()).toEqual([]);
    network.isOffline = false;
    await switchScenario(MOCK_SCENARIO.HAPPY);
    await app.controller.runCleanups();
    await waitForImport((state) => state.pendingCleanups.length === 0);
    const {jobs} = await readMockState();
    expect(jobs[0]?.status).toBe('deleted');
  });
});
