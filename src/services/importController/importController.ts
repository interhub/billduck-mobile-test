import AsyncStorage from '@react-native-async-storage/async-storage';
import {randomUUID} from 'expo-crypto';
import {createImportsApi} from '@/src/api/importsApi/importsApi';
import {uploadFileFromDisk} from '@/src/api/importsApi/nativeFileUploader';
import {ENV} from '@/src/config/env';
import {appActivity} from '@/src/services/importController/appActivity';
import {createImportController} from '@/src/services/importController/createImportController';
import {createOperationRepository} from '@/src/services/importController/operationRepository';
import {useAppStateStore} from '@/src/stores/appStateStore';
import {useImportStore} from '@/src/stores/importStore';
import {statementFileStore} from '@/src/utils/files/statementFileStore';
import {wait} from '@/src/utils/promise/wait';

/** The one import controller of the app, wired to the native file system, storage and network. */
export const importController = createImportController({
  api: createImportsApi({baseUrl: ENV.API_BASE_URL, uploadFile: uploadFileFromDisk}),
  repository: createOperationRepository(AsyncStorage),
  files: statementFileStore,
  store: useImportStore,
  activity: appActivity,
  createKey: randomUUID,
  now: () => new Date(),
  wait
});

// Back in the foreground the controller resumes polling, rereads a ready job and runs cleanups.
useAppStateStore.subscribe((state, previousState) => {
  if (state.isActive && !previousState.isActive) {
    importController.onForeground();
  }
});
