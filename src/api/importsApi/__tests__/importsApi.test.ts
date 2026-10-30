import {MOCK_READY_BODY} from '@/src/api/importsApi/__tests__/mockReadyReport';
import {createImportsApi, FileUploader} from '@/src/api/importsApi/importsApi';
import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

const BASE_URL = 'http://127.0.0.1:8787';
const QUEUED_BODY = JSON.stringify({jobId: 'job-demo-001', status: 'queued', revision: 1});

const answerWith = (status: number, body: string): FileUploader =>
  jest.fn(async () => ({status, body}));

const fetchAnswer = (status: number, body: string) =>
  jest.fn(async () => new Response(body, {status}));

const createRequest = {
  fileUri: 'file:///cache/imports/op-1',
  idempotencyKey: 'key-0000-0001',
  serverFileName: 'statement-20261029-1432.csv'
};

describe('createImport', () => {
  it('sends the bytes from disk with the headers of the contract', async () => {
    const uploadFile = answerWith(HTTP_STATUS.ACCEPTED, QUEUED_BODY);
    await createImportsApi({baseUrl: BASE_URL, uploadFile}).createImport(createRequest);
    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${BASE_URL}/imports`,
        fileUri: createRequest.fileUri,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Idempotency-Key': 'key-0000-0001',
          'X-File-Name': 'statement-20261029-1432.csv'
        }
      })
    );
  });

  it('takes a 202 as a queued job, never as a report', async () => {
    const result = await createImportsApi({
      baseUrl: BASE_URL,
      uploadFile: answerWith(HTTP_STATUS.ACCEPTED, QUEUED_BODY)
    }).createImport(createRequest);
    expect(result).toEqual({
      success: true,
      payload: expect.objectContaining({status: 'queued', revision: 1, items: null})
    });
  });
});

describe('createImport failures', () => {
  it('classifies refusals, server faults and unreadable bodies', async () => {
    const run = (status: number, body = '{}') =>
      createImportsApi({baseUrl: BASE_URL, uploadFile: answerWith(status, body)}).createImport(
        createRequest
      );
    expect(await run(415)).toEqual({
      success: false,
      error: {kind: ERROR_KIND.VALIDATION, httpStatus: 415}
    });
    expect(await run(409)).toEqual({
      success: false,
      error: {kind: ERROR_KIND.VALIDATION, httpStatus: 409}
    });
    expect(await run(503)).toEqual({
      success: false,
      error: {kind: ERROR_KIND.SERVER, httpStatus: 503}
    });
    expect(await run(HTTP_STATUS.ACCEPTED, 'not json')).toEqual({
      success: false,
      error: {kind: ERROR_KIND.SERVER, httpStatus: HTTP_STATUS.ACCEPTED}
    });
  });

  it('reports a dropped connection as NETWORK, without the error text', async () => {
    const uploadFile: FileUploader = jest.fn(async () => {
      throw new Error('Network request failed: /private/var/Выписка.pdf');
    });
    const result = await createImportsApi({baseUrl: BASE_URL, uploadFile}).createImport(
      createRequest
    );
    expect(result).toEqual({success: false, error: {kind: ERROR_KIND.NETWORK, httpStatus: null}});
  });

  it('stops the upload at the upload time limit and reports TIMEOUT', async () => {
    jest.useFakeTimers();
    try {
      const uploadFile: FileUploader = ({signal}) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
      const pending = createImportsApi({baseUrl: BASE_URL, uploadFile}).createImport(createRequest);
      await jest.advanceTimersByTimeAsync(LIMITS.UPLOAD_TIMEOUT_MS);
      expect(await pending).toEqual({
        success: false,
        error: {kind: ERROR_KIND.TIMEOUT, httpStatus: null}
      });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('reads and deletes', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('treats a 404 by key as "not found at this instant", not as a failure', async () => {
    globalThis.fetch = fetchAnswer(HTTP_STATUS.NOT_FOUND, '{"error":"job not found"}');
    const api = createImportsApi({
      baseUrl: BASE_URL,
      uploadFile: answerWith(HTTP_STATUS.ACCEPTED, QUEUED_BODY)
    });
    expect(await api.getImportByKey('key-0000-0001')).toEqual({success: true, payload: null});
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/imports/by-key/key-0000-0001`,
      expect.objectContaining({method: 'GET'})
    );
  });

  it('reads a ready job with its payments', async () => {
    globalThis.fetch = fetchAnswer(HTTP_STATUS.OK, MOCK_READY_BODY);
    const api = createImportsApi({
      baseUrl: BASE_URL,
      uploadFile: answerWith(HTTP_STATUS.ACCEPTED, QUEUED_BODY)
    });
    const result = await api.getImport('job-demo-001');
    expect(result.success && result.payload?.items?.length).toBe(2);
  });

  it('sends the delete key and reports a 503 as a server failure', async () => {
    globalThis.fetch = fetchAnswer(503, '{"error":"temporary delete failure"}');
    const api = createImportsApi({
      baseUrl: BASE_URL,
      uploadFile: answerWith(HTTP_STATUS.ACCEPTED, QUEUED_BODY)
    });
    expect(await api.deleteImport('job-demo-001', 'delete-key-0001')).toEqual({
      success: false,
      error: {kind: ERROR_KIND.SERVER, httpStatus: 503}
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/imports/job-demo-001`,
      expect.objectContaining({method: 'DELETE', headers: {'Idempotency-Key': 'delete-key-0001'}})
    );
  });
});
