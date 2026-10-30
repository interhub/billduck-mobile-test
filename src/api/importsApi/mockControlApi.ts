import {failure, failureForStatus} from '@/src/api/apiResult';
import {fetchText, runTimedRequest} from '@/src/api/importsApi/httpRequest';
import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ApiResult} from '@/src/types/importApi';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';
import {isRecord, parseJson} from '@/src/utils/json/parseJson';

/** Scenarios of the mock server, switched only from diagnostics and tests. */
export enum MOCK_SCENARIO {
  HAPPY = 'happy',
  LOST_ACK = 'lost_ack',
  STALE_STATUS = 'stale_status',
  DELETE_FAILURE = 'delete_failure'
}

export type MockCounters = {
  createRequests: number;
  newJobs: number;
  duplicateHits: number;
  acceptedBytes: number;
  deleteRequests: number;
};

type MockJob = {
  jobId: string;
  status: string;
  revision: number;
  bytes: number;
};

export type MockState = {
  mode: MOCK_SCENARIO;
  stats: MockCounters;
  jobs: MockJob[];
};

export const MOCK_SCENARIOS: readonly MOCK_SCENARIO[] = Object.values(MOCK_SCENARIO);

export const MOCK_COUNTER_KEYS: readonly (keyof MockCounters)[] = [
  'createRequests',
  'newJobs',
  'duplicateHits',
  'acceptedBytes',
  'deleteRequests'
];

const isScenario = (value: unknown): value is MOCK_SCENARIO => {
  return typeof value === 'string' && MOCK_SCENARIOS.some((scenario) => scenario === value);
};

const isCounters = (value: unknown): value is MockCounters => {
  return (
    isRecord(value) &&
    MOCK_COUNTER_KEYS.every((counterKey) => typeof value[counterKey] === 'number')
  );
};

const isMockJob = (value: unknown): value is MockJob => {
  return (
    isRecord(value) &&
    typeof value.jobId === 'string' &&
    typeof value.status === 'string' &&
    typeof value.revision === 'number' &&
    typeof value.bytes === 'number'
  );
};

/** Reads `GET /__test/state`; drops the hashes, which the screen never shows. */
const readMockState = (body: string): MockState | null => {
  const value = parseJson(body);
  if (!isRecord(value) || !isScenario(value.mode) || !isCounters(value.stats)) {
    return null;
  }
  if (!Array.isArray(value.jobs) || !value.jobs.every(isMockJob)) {
    return null;
  }
  const jobs = value.jobs.map(({jobId, status, revision, bytes}) => ({
    jobId,
    status,
    revision,
    bytes
  }));
  return {mode: value.mode, stats: value.stats, jobs};
};

/** One call to a test route; any status but 200 is a failure of its kind. */
const requestMock = async (
  baseUrl: string,
  path: string,
  init: RequestInit
): Promise<ApiResult<string>> => {
  const result = await runTimedRequest(
    (signal) => fetchText(`${baseUrl}${path}`, init, signal),
    LIMITS.REQUEST_TIMEOUT_MS
  );
  if (!result.success) {
    return result;
  }
  if (result.payload.status !== HTTP_STATUS.OK) {
    return failureForStatus(result.payload.status);
  }
  return {success: true, payload: result.payload.body};
};

/** A test route that answered 200 did its work; its body carries nothing the app reads. */
const toConfirmed = (result: ApiResult<string>): ApiResult<true> => {
  if (!result.success) {
    return result;
  }
  return {success: true, payload: true};
};

/** The mock's test routes. They exist for the reviewer and the tests, never for the import itself. */
export const createMockControlApi = (baseUrl: string) => {
  const checkHealth = async (): Promise<ApiResult<true>> =>
    toConfirmed(await requestMock(baseUrl, '/health', {method: 'GET'}));

  const getState = async (): Promise<ApiResult<MockState>> => {
    const result = await requestMock(baseUrl, '/__test/state', {method: 'GET'});
    if (!result.success) {
      return result;
    }
    const state = readMockState(result.payload);
    if (!state) {
      return failure(ERROR_KIND.SERVER, HTTP_STATUS.OK);
    }
    return {success: true, payload: state};
  };

  const setScenario = async (mode: MOCK_SCENARIO): Promise<ApiResult<true>> =>
    toConfirmed(
      await requestMock(baseUrl, '/__test/scenario', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode})
      })
    );

  const reset = async (): Promise<ApiResult<true>> =>
    toConfirmed(await requestMock(baseUrl, '/__test/reset', {method: 'POST'}));

  return {checkHealth, getState, setScenario, reset};
};
