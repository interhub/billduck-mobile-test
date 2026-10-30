import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useState} from 'react';
import {createMockControlApi, MOCK_SCENARIO, MockState} from '@/src/api/importsApi/mockControlApi';
import {ENV} from '@/src/config/env';
import {importController} from '@/src/services/importController/importController';
import {ApiResult} from '@/src/types/importApi';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

const mockControlApi = createMockControlApi(ENV.API_BASE_URL);

export type HealthState = 'checking' | 'ok' | 'down';

type MockDiagnostics = {
  health: HealthState;
  mockState: MockState | null;
  isBusy: boolean;
  refresh: () => Promise<void>;
  switchScenario: (scenario: MOCK_SCENARIO) => Promise<void>;
  resetAll: () => Promise<void>;
};

const resolveHealth = (healthResult: ApiResult<true>): HealthState => {
  if (healthResult.success) {
    return 'ok';
  }
  return 'down';
};

const resolveMockState = (stateResult: ApiResult<MockState>): MockState | null => {
  if (!stateResult.success) {
    return null;
  }
  return stateResult.payload;
};

/**
 * The mock's own view of the test: health, scenario and counters. Read on focus, on pull to
 * refresh and after every action, never on a timer: the test routes are not repeated on their own.
 */
export const useMockDiagnostics = (): MockDiagnostics => {
  const [health, setHealth] = useState<HealthState>('checking');
  const [mockState, setMockState] = useState<MockState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const refresh = useCallback(async () => {
    setHealth('checking');
    const [healthResult, stateResult] = await Promise.all([
      mockControlApi.checkHealth(),
      mockControlApi.getState()
    ]);
    setHealth(resolveHealth(healthResult));
    setMockState(resolveMockState(stateResult));
    if (!healthResult.success) {
      logger.w(LOG_NAME.warning_log, {
        type: LOG_TYPE.mock_control,
        error_kind: healthResult.error.kind,
        http_status: healthResult.error.httpStatus
      });
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );
  const switchScenario = async (scenario: MOCK_SCENARIO) => {
    setIsBusy(true);
    try {
      await mockControlApi.setScenario(scenario);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };
  const resetAll = async () => {
    setIsBusy(true);
    try {
      await mockControlApi.reset();
      await importController.forgetEverything();
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };
  return {health, mockState, isBusy, refresh, switchScenario, resetAll};
};
