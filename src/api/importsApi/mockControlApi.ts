import {fetchText, runTimedRequest} from '@/src/api/importsApi/httpRequest';
import {HTTP_STATUS} from '@/src/constants/HTTP_STATUS';
import {LIMITS} from '@/src/constants/LIMITS';
import {ApiResult} from '@/src/types/importApi';
import {ERROR_KIND, resolveHttpStatusErrorKind} from '@/src/utils/errors/resolveErrorKind';
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

/** The mock's test routes. They exist for the reviewer and the tests, never for the import itself. */
export const createMockControlApi = (baseUrl: string) => {
  const request = async (path: string, init: RequestInit): Promise<ApiResult<string>> => {
    const outcome = await runTimedRequest(
      (signal) => fetchText(`${baseUrl}${path}`, init, signal),
      LIMITS.REQUEST_TIMEOUT_MS
    );
    if (!outcome.success) {
      return {success: false, error: {kind: outcome.kind, httpStatus: null}};
    }
    if (outcome.answer.status !== HTTP_STATUS.OK) {
      const {status} = outcome.answer;
      return {
        success: false,
        error: {kind: resolveHttpStatusErrorKind(status), httpStatus: status}
      };
    }
    return {success: true, payload: outcome.answer.body};
  };

  const checkHealth = async (): Promise<ApiResult<true>> => {
    const result = await request('/health', {method: 'GET'});
    if (!result.success) {
      return result;
    }
    return {success: true, payload: true};
  };

  const getState = async (): Promise<ApiResult<MockState>> => {
    const result = await request('/__test/state', {method: 'GET'});
    if (!result.success) {
      return result;
    }
    const state = readMockState(result.payload);
    if (!state) {
      return {success: false, error: {kind: ERROR_KIND.SERVER, httpStatus: HTTP_STATUS.OK}};
    }
    return {success: true, payload: state};
  };

  const setScenario = async (mode: MOCK_SCENARIO): Promise<ApiResult<true>> => {
    const result = await request('/__test/scenario', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({mode})
    });
    if (!result.success) {
      return result;
    }
    return {success: true, payload: true};
  };

  const reset = async (): Promise<ApiResult<true>> => {
    const result = await request('/__test/reset', {method: 'POST'});
    if (!result.success) {
      return result;
    }
    return {success: true, payload: true};
  };

  return {checkHealth, getState, setScenario, reset};
};
