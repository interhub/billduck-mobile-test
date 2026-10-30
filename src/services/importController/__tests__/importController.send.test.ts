import AsyncStorage from '@react-native-async-storage/async-storage';
import {OPERATION_STORAGE_KEY} from '@/src/services/importController/operationRepository';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {logger} from '@/src/utils/logger/logger';
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
import {LONGER_THAN_EVERY_REPEAT_MS, UNTIL_READY_MS} from './controllerWaits';
import {
  CSV_STATEMENT,
  createFakeImportBackend,
  PDF_STATEMENT,
  SPOOFED_PDF
} from './fakeImportBackend';
import {QueuedPick} from './fakeStatementFiles';

const TEN_MIB = 10 * 1024 * 1024;

describe('import controller: sending', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reaches ready through queued and processing; the 202 is never the report', async () => {
    const backend = createFakeImportBackend();
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    expect(importState().draft?.phase).toBe('confirming');
    const sending = controller.send();
    await advance(0);
    expect(importState().operation?.phase).toBe('queued');
    expect(importState().payments).toBeNull();
    await advance(UNTIL_READY_MS);
    await sending;
    expect(importState().operation).toMatchObject({phase: 'ready', revision: 3});
    expect(importState().payments?.items).toHaveLength(2);
    expect(timelineEvents()).toEqual(
      expect.arrayContaining([
        TIMELINE_EVENT.UPLOAD_SENT,
        TIMELINE_EVENT.UPLOAD_ACCEPTED,
        TIMELINE_EVENT.STATUS_APPLIED
      ])
    );
    expect(backend.copies.size).toBe(0);
  });

  it('stores the operation with its key before the POST, and a relaunch only reads by key', async () => {
    const backend = createFakeImportBackend();
    const storedAtPost: string[] = [];
    const createImport = backend.api.createImport;
    backend.api.createImport = async (request) => {
      storedAtPost.push((await AsyncStorage.getItem(OPERATION_STORAGE_KEY)) ?? '');
      return createImport(request);
    };
    backend.server.holdUploads = true;
    const first = launchController(backend);
    await pickCsv(first.controller, backend);
    void first.controller.send();
    await advance(0);
    const sentKey = postRequests(backend)[0].headers['Idempotency-Key'];
    expect(JSON.parse(storedAtPost[0]).operation).toMatchObject({
      phase: 'uploading',
      idempotencyKey: sentKey
    });
    backend.server.holdUploads = false;
    const second = await crashAndRelaunch(first, backend);
    const requestsBefore = backend.server.requests.length;
    await second.controller.resume();
    const afterRelaunch = backend.server.requests.slice(requestsBefore);
    expect(afterRelaunch).toEqual([
      {method: 'GET', path: `/imports/by-key/${sentKey}`, headers: {}}
    ]);
    expect(importState().operation?.phase).toBe('not_received');
    expect(backend.server.stats.createRequests).toBe(0);
    const resending = second.controller.sendAgain();
    await advance(UNTIL_READY_MS);
    await resending;
    expect(postRequests(backend).map((request) => request.headers['Idempotency-Key'])).toEqual([
      sentKey,
      sentKey
    ]);
    expect(importState().operation?.phase).toBe('ready');
    expect(backend.server.stats.newJobs).toBe(1);
  });

  it('gives one key and one POST for a double press on "Send"', async () => {
    const backend = createFakeImportBackend();
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const firstPress = controller.send();
    const secondPress = controller.send();
    await advance(UNTIL_READY_MS);
    await Promise.all([firstPress, secondPress]);
    expect(postRequests(backend)).toHaveLength(1);
    expect(backend.server.stats).toMatchObject({createRequests: 1, newJobs: 1, duplicateHits: 0});
  });

  it('stops at failed on a 4xx answer to the upload, with no repeat', async () => {
    const backend = createFakeImportBackend();
    backend.server.forcedUploadStatus = 400;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    const sending = controller.send();
    await advance(LONGER_THAN_EVERY_REPEAT_MS);
    await sending;
    expect(importState().operation).toMatchObject({
      phase: 'failed',
      failure: {reason: 'server_rejected', httpStatus: 400}
    });
    expect(postRequests(backend)).toHaveLength(1);
    expect(backend.copies.size).toBe(0);
  });

  it('keeps the Russian file name away from the server and the logs', async () => {
    const backend = createFakeImportBackend();
    const logCalls = [jest.spyOn(logger, 'd'), jest.spyOn(logger, 'w'), jest.spyOn(logger, 'e')];
    const {controller} = launchController(backend);
    backend.queuePick({
      kind: 'file',
      name: 'Выписка за октябрь 🦆.pdf',
      mimeType: 'application/pdf',
      content: PDF_STATEMENT
    });
    await controller.pickFile();
    expect(importState().draft?.originalName).toBe('Выписка за октябрь 🦆.pdf');
    const sending = controller.send();
    await advance(UNTIL_READY_MS);
    await sending;
    expect(importState().operation?.phase).toBe('ready');
    const [upload] = postRequests(backend);
    expect(upload.headers['X-File-Name']).toMatch(/^statement-\d{8}-\d{4}\.pdf$/);
    const everything = JSON.stringify([
      backend.server.requests,
      ...logCalls.map((spy) => spy.mock.calls)
    ]);
    expect(everything).not.toContain('Выписка');
    expect(everything).not.toContain('%PDF');
    expect(await AsyncStorage.getItem(OPERATION_STORAGE_KEY)).not.toContain('Выписка');
  });
});

describe('import controller: checks before any network', () => {
  beforeEach(resetWorld);

  afterEach(() => {
    jest.useRealTimers();
  });

  const pickAndCheck = async (pick: QueuedPick) => {
    const backend = createFakeImportBackend();
    const {controller} = launchController(backend);
    backend.queuePick(pick);
    const isPicked = await controller.pickFile();
    return {backend, controller, isPicked};
  };

  it('rejects spoofed.pdf as a fake PDF without a request', async () => {
    const {backend} = await pickAndCheck({
      kind: 'file',
      name: 'spoofed.pdf',
      mimeType: 'application/pdf',
      content: SPOOFED_PDF
    });
    expect(importState().draft).toMatchObject({
      phase: 'rejected',
      rejection: STATEMENT_REJECTION.FAKE_PDF
    });
    expect(backend.server.requests).toEqual([]);
    expect(backend.copies.size).toBe(0);
  });

  it('rejects a file above 10 MiB by its reported size before reading it', async () => {
    const {backend} = await pickAndCheck({
      kind: 'file',
      name: 'oversize.csv',
      mimeType: 'text/csv',
      content: CSV_STATEMENT,
      reportedSize: TEN_MIB + 11
    });
    expect(importState().draft).toMatchObject({
      phase: 'rejected',
      rejection: STATEMENT_REJECTION.TOO_LARGE
    });
    expect(backend.server.requests).toEqual([]);
  });

  it('accepts exactly 10 MiB and rejects one byte more', async () => {
    const content = CSV_STATEMENT + 'x'.repeat(TEN_MIB - CSV_STATEMENT.length);
    await pickAndCheck({kind: 'file', name: 'big.csv', mimeType: 'text/csv', content});
    expect(importState().draft?.phase).toBe('confirming');
    await resetWorld();
    await pickAndCheck({
      kind: 'file',
      name: 'big.csv',
      mimeType: 'text/csv',
      content: `${content}x`
    });
    expect(importState().draft).toMatchObject({
      phase: 'rejected',
      rejection: STATEMENT_REJECTION.TOO_LARGE
    });
  });

  it('rejects an empty file, a CSV with \\r\\n and a CSV with a byte order mark', async () => {
    const files = [
      '',
      'date,description,amount\r\n2026-09-01,StreamBeam,-19.99\r\n',
      `\uFEFF${CSV_STATEMENT}`
    ];
    for (const content of files) {
      await resetWorld();
      const {backend} = await pickAndCheck({
        kind: 'file',
        name: 'statement.csv',
        mimeType: 'text/csv',
        content
      });
      expect(importState().draft?.phase).toBe('rejected');
      expect(backend.server.requests).toEqual([]);
    }
  });

  it('returns calmly when the picker is cancelled, leaving no draft and no copy', async () => {
    const {backend, isPicked} = await pickAndCheck({kind: 'cancel'});
    expect(isPicked).toBe(false);
    expect(importState().draft).toBeNull();
    expect(backend.copies.size).toBe(0);
  });

  it('says the file cannot be read when the picker fails, leaving no copy', async () => {
    const {backend} = await pickAndCheck({kind: 'unreadable'});
    expect(importState().draft).toMatchObject({
      phase: 'rejected',
      rejection: STATEMENT_REJECTION.UNREADABLE
    });
    expect(backend.copies.size).toBe(0);
  });

  it('says the file cannot be read when its copy cannot be measured, leaving no copy', async () => {
    const backend = createFakeImportBackend();
    backend.disk.isUnreadable = true;
    const {controller} = launchController(backend);
    await pickCsv(controller, backend);
    expect(importState().draft).toMatchObject({
      phase: 'rejected',
      rejection: STATEMENT_REJECTION.UNREADABLE
    });
    expect(backend.server.requests).toEqual([]);
    expect(backend.copies.size).toBe(0);
  });

  it('removes the private copy when the confirm screen is cancelled', async () => {
    const {backend, controller} = await pickAndCheck({
      kind: 'file',
      name: 'statement.csv',
      mimeType: 'text/csv',
      content: CSV_STATEMENT
    });
    expect(backend.copies.size).toBe(1);
    controller.cancelDraft();
    expect(importState().draft).toBeNull();
    expect(backend.copies.size).toBe(0);
  });
});
