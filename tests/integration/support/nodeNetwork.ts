import {readFileSync} from 'node:fs';
import {createImportsApi, FileUploader} from '@/src/api/importsApi/importsApi';

export type RecordedHttpRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyBytes: number | null;
};

/** The address of the mock the global setup started for this run. */
export const mockBaseUrl = (): string => {
  const url = process.env.MOCK_BASE_URL;
  if (!url) {
    throw new Error('MOCK_BASE_URL is not set: the integration global setup did not run');
  }
  return url;
};

const nodeFetch = globalThis.fetch;

type NetworkState = {
  isOffline: boolean;
  recorded: RecordedHttpRequest[];
};

/** Every request the client sends goes through here; "offline" fails it before the network. */
export const network: NetworkState = {
  isOffline: false,
  recorded: []
};

const isTestRoute = (url: string): boolean => url.includes('/__test/') || url.endsWith('/health');

const toHeaderRecord = (headers: HeadersInit | undefined): Record<string, string> => {
  return Object.fromEntries(new Headers(headers).entries());
};

const recordingFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  if (!isTestRoute(url)) {
    network.recorded.push({
      method: init?.method ?? 'GET',
      url,
      headers: toHeaderRecord(init?.headers),
      bodyBytes: null
    });
    if (network.isOffline) {
      throw new TypeError('Network request failed');
    }
  }
  return nodeFetch(input, init);
};

/** Puts the recorder in front of `fetch` for the tests of one file; call it at the top of the file. */
export const installRequestRecorder = () => {
  beforeAll(() => {
    globalThis.fetch = recordingFetch;
  });
  afterAll(() => {
    globalThis.fetch = nodeFetch;
  });
};

/** Sends the same bytes and headers as the native upload task, from Node. */
const uploadFromNode: FileUploader = async ({url, fileUri, headers, signal}) => {
  const body = readFileSync(fileUri);
  network.recorded.push({
    method: 'POST',
    url,
    headers: toHeaderRecord(headers),
    bodyBytes: body.length
  });
  if (network.isOffline) {
    throw new TypeError('Network request failed');
  }
  const response = await nodeFetch(url, {method: 'POST', headers, body, signal});
  return {status: response.status, body: await response.text()};
};

/** The API client the phones use: the real client with the Node upload, against the mock. */
export const createNodeImportsApi = () =>
  createImportsApi({baseUrl: mockBaseUrl(), uploadFile: uploadFromNode});
