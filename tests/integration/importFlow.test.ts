import {statSync} from 'node:fs';
import path from 'node:path';
import {MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {LANGUAGE} from '@/src/i18n/translations';
import {OPERATION_STORAGE_KEY} from '@/src/services/importController/operationRepository';
import {useImportStore} from '@/src/stores/importStore';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {logger} from '@/src/utils/logger/logger';
import {
  createPhone,
  disposePhones,
  FIXTURES,
  readCounters,
  startScenario,
  waitForImport,
  waitForPhase
} from '@/tests/integration/support/importTestEnvironment';
import {installRequestRecorder, network} from '@/tests/integration/support/nodeNetwork';

installRequestRecorder();
afterEach(disposePhones);

/** Header limits of the mock contract. */
const IDEMPOTENCY_KEY_LENGTH = {min: 8, max: 128};
const PRINTABLE_ASCII_FILE_NAME = /^[\x20-\x7e]{1,255}$/;

const fixtureSize = (name: string) => statSync(path.join(FIXTURES, name)).size;

describe('happy path against the real mock', () => {
  it.each([
    ['statement.csv', 'text/csv'],
    ['statement.pdf', 'application/pdf']
  ])(
    'sends the real bytes of %s and shows the report only after ready',
    async (fixture, mimeType) => {
      await startScenario(MOCK_SCENARIO.HAPPY);
      const phone = createPhone();
      await phone.launch().sendFixture(fixture, {mimeType});
      await waitForImport(
        (state) => state.operation?.phase === 'queued' || state.operation?.phase === 'processing'
      );
      expect(useImportStore.getState().payments).toBeNull();
      const ready = await waitForPhase('ready');
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
});

describe('the contract and the privacy of every request', () => {
  it('keeps every request inside the contract of the mock', async () => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const app = createPhone().launch();
    await app.sendFixture('statement.csv', {mimeType: 'text/csv'});
    await waitForPhase('ready');
    void app.controller.deleteImport();
    await waitForImport((state) => state.outcome?.kind === 'deleted');
    const posts = network.recorded.filter((request) => request.method === 'POST');
    const deletes = network.recorded.filter((request) => request.method === 'DELETE');
    expect(posts).toHaveLength(1);
    for (const post of posts) {
      expect(post.headers['content-type']).toBe('application/octet-stream');
      expect(post.headers['idempotency-key'].length).toBeGreaterThanOrEqual(
        IDEMPOTENCY_KEY_LENGTH.min
      );
      expect(post.headers['idempotency-key'].length).toBeLessThanOrEqual(
        IDEMPOTENCY_KEY_LENGTH.max
      );
      expect(post.headers['x-file-name']).toMatch(PRINTABLE_ASCII_FILE_NAME);
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
    const phone = createPhone();
    await phone
      .launch()
      .sendFixture('statement.pdf', {name: 'Выписка за октябрь.pdf', mimeType: 'application/pdf'});
    await waitForPhase('ready');
    const [upload] = network.recorded.filter((request) => request.method === 'POST');
    expect(upload.headers['x-file-name']).toMatch(/^statement-\d{8}-\d{4}\.pdf$/);
    const everything = JSON.stringify([network.recorded, ...logCalls.map((spy) => spy.mock.calls)]);
    expect(everything).not.toContain('Выписка');
    expect(everything).not.toContain('%PDF');
    expect(await phone.storage.getItem(OPERATION_STORAGE_KEY)).not.toContain('Выписка');
    for (const spy of logCalls) {
      spy.mockRestore();
    }
  });
});

describe('files rejected before the network', () => {
  it.each([
    ['spoofed.pdf', 'application/pdf', STATEMENT_REJECTION.FAKE_PDF],
    ['oversize.csv', 'text/csv', STATEMENT_REJECTION.TOO_LARGE]
  ])('rejects %s and leaves createRequests unchanged', async (fixture, mimeType, rejection) => {
    await startScenario(MOCK_SCENARIO.HAPPY);
    const before = await readCounters();
    const phone = createPhone();
    const {controller} = phone.launch();
    phone.pickFixture(fixture, {mimeType});
    await controller.pickFile();
    expect(useImportStore.getState().draft).toMatchObject({phase: 'rejected', rejection});
    await controller.send();
    expect(await readCounters()).toEqual(before);
    expect(network.recorded).toEqual([]);
    expect(phone.listCopies()).toEqual([]);
  });
});
