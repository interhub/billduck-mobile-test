import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useState} from 'react';
import {createMockControlApi, MockState} from '@/src/api/importsApi/mockControlApi';
import {HealthState} from '@/src/screens/Diagnostics/logic/describeHealth';
import {ApiResult} from '@/src/types/importApi';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

type MockControlClient = ReturnType<typeof createMockControlApi>;

type MockStateView = {
  health: HealthState;
  mockState: MockState | null;
  refresh: () => Promise<void>;
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
 * The mock's own view of the test: health, scenario and counters. Read on focus and on every
 * `refresh`, never on a timer: the test routes are not repeated on their own.
 */
export const useMockState = (mockControlApi: MockControlClient): MockStateView => {
  const [health, setHealth] = useState<HealthState>('checking');
  const [mockState, setMockState] = useState<MockState | null>(null);
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
  }, [mockControlApi]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );
  return {health, mockState, refresh};
};
