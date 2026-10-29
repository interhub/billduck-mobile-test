import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createImportsApi} from '@/src/api/importsApi/importsApi';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {useImportStore} from '@/src/stores/importStore';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {
  createPhone,
  FIXTURES,
  importPhase,
  mock,
  network,
  readCounters,
  startScenario,
  waitForImport
} from './support/importTestEnvironment';

const isReady = () => importPhase() === 'ready';
const events = () => useImportStore.getState().timeline.map((entry) => entry.event);

const directApi = () =>
  createImportsApi({
    baseUrl: process.env.MOCK_BASE_URL ?? '',
    uploadFile: async ({url, fileUri, headers}) => {
      const response = await fetch(url, {method: 'POST', headers, body: readFileSync(fileUri)});
      return {status: response.status, body: await response.text()};
    }
  });

/** Another client's upload, made straight through the API client. */
const uploadDirectly = async (fixture: string, idempotencyKey: string): Promise<string | null> => {
  const result = await directApi().createImport({
    fileUri: path.join(FIXTURES, fixture),
    idempotencyKey,
    serverFileName: 'statement-20261029-1432.pdf'
  });
  return result.success ? result.payload.jobId : null;
};

describe('lost_ack', () => {
  const phone = createPhone();

  afterAll(phone.dispose);

  it('recovers the job by key with no button and creates one job', async () => {
    await startScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller} = phone.launch();
    phone.pickFixture('statement.csv');
    await controller.pickFile();
    void controller.send();
    await waitForImport(() => importPhase() === 'reconnecting');
    await waitForImport(isReady);
    expect(events()).toEqual(
      expect.arrayContaining([TIMELINE_EVENT.UPLOAD_ANSWER_LOST, TIMELINE_EVENT.KEY_LOOKUP_FOUND])
    );
    expect(await readCounters()).toMatchObject({newJobs: 1, createRequests: 1});
  });

  it('keeps one job when the app is restarted before the recovery', async () => {
    await startScenario(MOCK_SCENARIO.LOST_ACK);
    const first = phone.launch();
    phone.pickFixture('statement.csv');
    await first.controller.pickFile();
    void first.controller.send();
    await waitForImport(() => importPhase() === 'reconnecting');
    first.crash();
    useImportStore.setState({operation: null, payments: null, timeline: []});
    const second = phone.launch();
    await second.controller.restore();
    await second.controller.resume();
    await waitForImport(isReady);
    expect(events()).toContain(TIMELINE_EVENT.APP_RESTARTED);
    expect(await readCounters()).toMatchObject({newJobs: 1, createRequests: 1});
  });

  it('answers a repeated POST with the same key and bytes with the same job and a duplicate hit', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const api = directApi();
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
  const phone = createPhone();

  afterAll(phone.dispose);

  it('skips processing r2 after ready r3 and keeps the report', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const {controller} = phone.launch();
    phone.pickFixture('statement.csv');
    await controller.pickFile();
    void controller.send();
    await waitForImport(isReady);
    await mock.setScenario(MOCK_SCENARIO.STALE_STATUS);
    await controller.refreshStatus();
    await controller.refreshStatus();
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
  const phone = createPhone();

  afterAll(phone.dispose);

  it('stays honest on a 503 and reaches deleted with the same key after happy', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const {controller} = phone.launch();
    phone.pickFixture('statement.csv');
    await controller.pickFile();
    void controller.send();
    await waitForImport(isReady);
    await mock.setScenario(MOCK_SCENARIO.DELETE_FAILURE);
    expect(await controller.deleteImport()).toBe('failed');
    expect(importPhase()).toBe('delete_failed');
    expect(useImportStore.getState().outcome).toBeNull();
    await mock.setScenario(MOCK_SCENARIO.HAPPY);
    void controller.retry();
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
  const phone = createPhone();

  afterAll(phone.dispose);

  it('moves a job the server forgot to gone_on_server and never takes the new job with the same number', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const first = phone.launch();
    phone.pickFixture('statement.csv');
    await first.controller.pickFile();
    void first.controller.send();
    await waitForImport(isReady);
    await mock.reset();
    const strangerJob = await uploadDirectly('statement.pdf', `stranger-${Date.now()}`);
    expect(strangerJob).toBe('job-demo-001');
    first.crash();
    useImportStore.setState({operation: null, payments: null});
    const relaunched = phone.launch();
    await relaunched.controller.restore();
    await relaunched.controller.resume();
    expect(useImportStore.getState().operation).toBeNull();
    expect(useImportStore.getState().outcome?.kind).toBe('gone_on_server');
    expect((await readCounters()).deleteRequests).toBe(0);
  });

  it('deletes a cancelled upload once the server answers again, if it got there', async () => {
    await startScenario(MOCK_SCENARIO.LOST_ACK);
    const {controller} = phone.launch();
    phone.pickFixture('statement.csv');
    await controller.pickFile();
    void controller.send();
    await waitForImport(() => importPhase() === 'reconnecting');
    network.isOffline = true;
    await waitForImport(() => importPhase() === 'server_unavailable');
    await controller.cancelUpload();
    expect(useImportStore.getState().pendingCleanups).toHaveLength(1);
    expect(phone.listCopies()).toEqual([]);
    network.isOffline = false;
    await mock.setScenario(MOCK_SCENARIO.HAPPY);
    await controller.runCleanups();
    await waitForImport((state) => state.pendingCleanups.length === 0);
    const state = await mock.getState();
    expect(state.success && state.payload.jobs[0]?.status).toBe('deleted');
  });
});
