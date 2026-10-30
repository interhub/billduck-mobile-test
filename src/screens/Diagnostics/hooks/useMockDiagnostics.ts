import {useState} from 'react';
import {createMockControlApi, MOCK_SCENARIO, MockState} from '@/src/api/importsApi/mockControlApi';
import {ENV} from '@/src/config/env';
import {useMockState} from '@/src/screens/Diagnostics/hooks/useMockState';
import {HealthState} from '@/src/screens/Diagnostics/logic/describeHealth';
import {importController} from '@/src/services/importController/importController';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

const mockControlApi = createMockControlApi(ENV.API_BASE_URL);

type MockDiagnostics = {
  health: HealthState;
  mockState: MockState | null;
  isBusy: boolean;
  refresh: () => Promise<void>;
  switchScenario: (scenario: MOCK_SCENARIO) => Promise<void>;
  resetAll: () => Promise<void>;
};

/** The mock's state with the two test actions: switch the scenario, reset the mock and the phone. */
export const useMockDiagnostics = (): MockDiagnostics => {
  const {health, mockState, refresh} = useMockState(mockControlApi);
  const [isBusy, setIsBusy] = useState(false);
  const switchScenario = async (scenario: MOCK_SCENARIO) => {
    setIsBusy(true);
    try {
      const switched = await mockControlApi.setScenario(scenario);
      if (!switched.success) {
        logger.w(LOG_NAME.warning_log, {
          type: LOG_TYPE.mock_control,
          error_kind: switched.error.kind,
          http_status: switched.error.httpStatus
        });
      }
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };
  const resetAll = async () => {
    setIsBusy(true);
    try {
      const reset = await mockControlApi.reset();
      // The phone forgets its import only once the mock has forgotten it too.
      if (!reset.success) {
        logger.w(LOG_NAME.warning_log, {
          type: LOG_TYPE.mock_control,
          error_kind: reset.error.kind,
          http_status: reset.error.httpStatus
        });
        await refresh();
        return;
      }
      await importController.forgetEverything();
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };
  return {health, mockState, isBusy, refresh, switchScenario, resetAll};
};
