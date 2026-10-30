import {advance, launchController, pickCsv} from './controllerHarness';
import {createFakeImportBackend} from './fakeImportBackend';

/** A statement sent and read all the way to ready: its backend and the process that sent it. */
export const readyImport = async () => {
  const backend = createFakeImportBackend();
  const launched = launchController(backend);
  await pickCsv(launched.controller, backend);
  const sending = launched.controller.send();
  await advance(1500);
  await sending;
  return {backend, ...launched};
};
