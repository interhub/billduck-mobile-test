import {advance, launchController, pickCsv} from './controllerHarness';
import {UNTIL_READY_MS} from './controllerWaits';
import {createFakeImportBackend} from './fakeImportBackend';

/** A statement sent and accepted as queued: its backend and the process that sent it. */
export const queuedImport = async () => {
  const backend = createFakeImportBackend();
  const launched = launchController(backend);
  await pickCsv(launched.controller, backend);
  void launched.controller.send();
  await advance(0);
  return {backend, ...launched};
};

/** A statement sent and read all the way to ready: its backend and the process that sent it. */
export const readyImport = async () => {
  const backend = createFakeImportBackend();
  const launched = launchController(backend);
  await pickCsv(launched.controller, backend);
  const sending = launched.controller.send();
  await advance(UNTIL_READY_MS);
  await sending;
  return {backend, ...launched};
};
