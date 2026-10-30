import {createMockControlApi, MOCK_SCENARIO} from '@/src/api/importsApi/mockControlApi';
import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

const BASE_URL = 'http://127.0.0.1:8787';
const MOCK_COUNTERS = {
  createRequests: 2,
  newJobs: 1,
  duplicateHits: 1,
  acceptedBytes: 112,
  deleteRequests: 0
};
const STATE_BODY = JSON.stringify({
  mode: 'lost_ack',
  stats: MOCK_COUNTERS,
  jobs: [{jobId: 'job-demo-001', status: 'ready', revision: 3, bytes: 112, sha256: 'f00d'}]
});

const fetchAnswer = (status: number, body: string) =>
  jest.fn(async () => new Response(body, {status}));

describe('createMockControlApi', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('confirms a test route that answered 200 and sends the scenario as JSON', async () => {
    globalThis.fetch = fetchAnswer(HTTP_STATUS.OK, '{"ok":true}');
    const api = createMockControlApi(BASE_URL);
    expect(await api.setScenario(MOCK_SCENARIO.LOST_ACK)).toEqual({success: true, payload: true});
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/__test/scenario`,
      expect.objectContaining({method: 'POST', body: JSON.stringify({mode: 'lost_ack'})})
    );
  });

  it('reads the state of the mock without the hashes', async () => {
    globalThis.fetch = fetchAnswer(HTTP_STATUS.OK, STATE_BODY);
    expect(await createMockControlApi(BASE_URL).getState()).toEqual({
      success: true,
      payload: {
        mode: MOCK_SCENARIO.LOST_ACK,
        stats: MOCK_COUNTERS,
        jobs: [{jobId: 'job-demo-001', status: 'ready', revision: 3, bytes: 112}]
      }
    });
  });

  it('gives another status its own kind and takes an unreadable state as a server fault', async () => {
    globalThis.fetch = fetchAnswer(503, '');
    expect(await createMockControlApi(BASE_URL).reset()).toEqual({
      success: false,
      error: {kind: ERROR_KIND.SERVER, httpStatus: 503}
    });
    globalThis.fetch = fetchAnswer(HTTP_STATUS.OK, '{"mode":"broken"}');
    expect(await createMockControlApi(BASE_URL).getState()).toEqual({
      success: false,
      error: {kind: ERROR_KIND.SERVER, httpStatus: HTTP_STATUS.OK}
    });
  });

  it('reports a mock that does not answer as NETWORK', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await createMockControlApi(BASE_URL).checkHealth()).toEqual({
      success: false,
      error: {kind: ERROR_KIND.NETWORK, httpStatus: null}
    });
  });
});
