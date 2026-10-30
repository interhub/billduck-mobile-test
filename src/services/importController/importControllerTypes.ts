import {ImportsApi} from '@/src/api/importsApi/importsApi';
import {OperationRepository} from '@/src/services/importController/operationRepository';
import {ImportStoreApi} from '@/src/stores/importStore';
import {AppActivity, StatementFileStore} from '@/src/types/statementFiles';
import {WaitFunction} from '@/src/utils/promise/wait';

export type ImportControllerDeps = {
  api: ImportsApi;
  repository: OperationRepository;
  files: StatementFileStore;
  store: ImportStoreApi;
  activity: AppActivity;
  createUuid: () => string;
  now: () => Date;
  wait: WaitFunction;
};
