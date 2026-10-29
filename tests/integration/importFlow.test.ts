import {statSync} from 'node:fs';
import path from 'node:path';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {LANGUAGE} from '@/src/i18n/translations';
import {useImportStore} from '@/src/stores/importStore';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {logger} from '@/src/utils/logger/logger';
import {
  createPhone,
  FIXTURES,
  importPhase,
  network,
  readCounters,
  startScenario,
  waitForImport
} from './support/importTestEnvironment';

const isReady = () => importPhase() === 'ready';
const fixtureSize = (name: string) => statSync(path.join(FIXTURES, name)).size;

describe('happy path against the real mock', () => {
  const phone = createPhone();

  afterAll(phone.dispose);

  it.each([
    ['statement.csv', 'text/csv'],
    ['statement.pdf', 'application/pdf']
  ])(
    'sends the real bytes of %s and shows the report only after ready',
    async (fixture, mimeType) => {
      await startScenario(MOCK_SCENARIO.HAPPY);
      const {controller} = phone.launch();
      phone.pickFixture(fixture, fixture, mimeType);
      await controller.pickFile();
      void controller.send();
      await waitForImport(
        (state) => state.operation?.phase === 'queued' || state.operation?.phase === 'processing'
      );
      expect(useImportStore.getState().payments).toBeNull();
      const ready = await waitForImport(isReady);
      expect(ready.payments?.items).toHaveLength(2);
      expect(formatMonthlyTotal(ready.payments?.items ?? [], 'AUD', LANGUAGE.EN)).toBe(
        '151.99 AUD / month'
      );
      expect(formatMonthlyTotal(ready.payments?.items ?? [], 'AUD', LANGUAGE.RU)).toBe(
        '151,99 AUD в месяц'
      );
      expect(await readCounters()).toMatchObject({
        createRequests: 1,
        newJobs: 1,
        acceptedBytes: fixtureSize(fixture)
      });
      expect(phone.listCopies()).toEqual([]);
    }
  );

  it('keeps every request inside the contract of the mock', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const {controller} = phone.launch();
    phone.pickFixture('statement.csv', 'statement.csv', 'text/csv');
    await controller.pickFile();
    void controller.send();
    await waitForImport(isReady);
    void controller.deleteImport();
    await waitForImport((state) => state.outcome?.kind === 'deleted');
    const posts = network.recorded.filter((request) => request.method === 'POST');
    const deletes = network.recorded.filter((request) => request.method === 'DELETE');
    expect(posts).toHaveLength(1);
    for (const post of posts) {
      expect(post.headers['content-type']).toBe('application/octet-stream');
      expect(post.headers['idempotency-key'].length).toBeGreaterThanOrEqual(8);
      expect(post.headers['idempotency-key'].length).toBeLessThanOrEqual(128);
      expect(post.headers['x-file-name']).toMatch(/^[\x20-\x7e]{1,255}$/);
      expect(post.bodyBytes).toBe(fixtureSize('statement.csv'));
    }
    expect(deletes).toHaveLength(1);
    expect(deletes[0].headers['idempotency-key']).not.toBe(posts[0].headers['idempotency-key']);
    const lastGet = network.recorded.filter((request) => request.method === 'GET').at(-1);
    expect(lastGet?.url).toMatch(/\/imports\/job-demo-001$/);
    expect(useImportStore.getState().timeline.at(-1)?.event).toBe(TIMELINE_EVENT.DELETED);
  });

  it('never lets a Russian file name reach the server or the logs', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const logCalls = [jest.spyOn(logger, 'd'), jest.spyOn(logger, 'w'), jest.spyOn(logger, 'e')];
    const {controller} = phone.launch();
    phone.pickFixture('statement.pdf', 'Выписка за октябрь.pdf', 'application/pdf');
    await controller.pickFile();
    void controller.send();
    await waitForImport(isReady);
    const [upload] = network.recorded.filter((request) => request.method === 'POST');
    expect(upload.headers['x-file-name']).toMatch(/^statement-\d{8}-\d{4}\.pdf$/);
    const everything = JSON.stringify([network.recorded, ...logCalls.map((spy) => spy.mock.calls)]);
    expect(everything).not.toContain('Выписка');
    expect(everything).not.toContain('%PDF');
    expect(await phone.storage.getItem('billduck.import_operation.v1')).not.toContain('Выписка');
    for (const spy of logCalls) {
      spy.mockRestore();
    }
  });
});

describe('files rejected before the network', () => {
  const phone = createPhone();

  afterAll(phone.dispose);

  it.each([
    ['spoofed.pdf', 'application/pdf', STATEMENT_REJECTION.FAKE_PDF],
    ['oversize.csv', 'text/csv', STATEMENT_REJECTION.TOO_LARGE]
  ])('rejects %s and leaves createRequests unchanged', async (fixture, mimeType, rejection) => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const before = await readCounters();
    const {controller} = phone.launch();
    phone.pickFixture(fixture, fixture, mimeType);
    await controller.pickFile();
    expect(useImportStore.getState().draft).toMatchObject({phase: 'rejected', rejection});
    await controller.send();
    expect(await readCounters()).toEqual(before);
    expect(network.recorded).toEqual([]);
    expect(phone.listCopies()).toEqual([]);
  });
});
