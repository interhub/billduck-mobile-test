import {createFakeImportsApi} from './fakeImportsApi';
import {createFakeServer, FakeJob} from './fakeServer';
import {createFakeDisk, createFakeStatementFiles, QueuedPick} from './fakeStatementFiles';

/** Another client's statement on the same mock. */
const STRANGER_KEY = 'stranger-key-0001';
const STRANGER_BYTES = 'date,description,amount\n';

/**
 * An in-memory server with the rules of the kit's mock (scenarios, revisions, keys, counters)
 * plus switches the mock lacks: offline, a held upload answer, a held status read, a lost delete
 * answer, a forced upload status and a refused status read; and the private folder of a phone
 * with its picker. Unit tests drive it under Jest fake timers; the integration tests use the
 * real mock.
 */
export const createFakeImportBackend = () => {
  const server = createFakeServer();
  const disk = createFakeDisk();
  return {
    api: createFakeImportsApi(server, disk),
    files: createFakeStatementFiles(disk),
    server,
    disk,
    copies: disk.copies,
    queuePick: (pick: QueuedPick) => {
      disk.picks.push(pick);
    },
    setScenario: server.setScenario,
    reset: server.reset,
    /** Another client's upload: after a reset it takes the number our stored job had. */
    addStrangerJob: (): FakeJob => server.addJob(STRANGER_KEY, STRANGER_BYTES),
    /** The next status read gets its answer at once, but hands it over only on release. */
    holdNextStatusRead: () => {
      const gate = Promise.withResolvers<void>();
      server.statusReadGates.push(gate.promise);
      return gate.resolve;
    },
    releaseUploads: () => {
      for (const release of server.heldUploads.splice(0)) {
        release();
      }
    }
  };
};

export type FakeImportBackend = ReturnType<typeof createFakeImportBackend>;

export const CSV_STATEMENT =
  'date,description,amount\n2026-09-01,StreamBeam,-19.99\n2026-10-01,StreamBeam,-19.99\n2026-10-03,BrightGrid,-132.00\n';
export const PDF_STATEMENT = '%PDF-1.3\n%synthetic statement\n';
export const SPOOFED_PDF =
  'This is plain text, not a PDF. The extension and supplied MIME type are misleading.\n';
