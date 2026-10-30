import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {
  describeDetail,
  describeImportStatus,
  describeStatementTitle
} from '@/src/screens/Import/logic/describeImportStatus';
import {ImportFailure} from '@/src/types/importOperation';
import {BadgePhase} from '@/src/utils/import/importPhases';

const EN = TRANSLATIONS[LANGUAGE.EN];

const describePhase = (
  phase: BadgePhase,
  {hasJob = false, isPollingSilent = false, isReplacementBlocked = false} = {},
  failure: ImportFailure | null = null
) => describeImportStatus({phase, hasJob, isPollingSilent, isReplacementBlocked, failure}, EN);

/** The wording and the picture of every phase, with no job and no failure. */
const PHASE_WORDING = [
  ['uploading', 'Sending the file to the server.', 'waiting'],
  ['queued', 'The server accepted the file. It waits in the queue.', 'waiting'],
  ['processing', 'The server is reading the statement.', 'waiting'],
  ['ready', 'The server finished. The report is ready.', 'ready'],
  [
    'reconnecting',
    'The answer to the upload got lost. Checking whether the file reached the server.',
    'unknown'
  ],
  ['server_unavailable', "The server isn't responding. Your file is safe on this phone.", 'error'],
  [
    'not_received',
    "The file didn't reach the server. It is still on this phone and can be sent again.",
    'unknown'
  ],
  ['failed', 'The server refused this file.', 'error'],
  [
    'replacing_previous',
    'Deleting the previous statement from the server first. The new one waits.',
    'deleting'
  ],
  ['deleting', "Deleting… The server hasn't confirmed it yet.", 'deleting'],
  [
    'delete_failed',
    "Not deleted. The server didn't confirm it, your data is still there.",
    'error'
  ],
  ['deleted', 'Deleted. The server confirmed it.', 'deleted'],
  ['gone_on_server', 'The server no longer knows this statement.', 'unknown']
] as const;

describe('describeImportStatus for every phase', () => {
  it.each(PHASE_WORDING)('says the %s phase honestly', (phase, explanation, illustration) => {
    expect(describePhase(phase)).toEqual({badgePhase: phase, explanation, illustration});
  });
});

describe('describeImportStatus in the special cases', () => {
  it('tells a lost upload answer from a silent job', () => {
    expect(describePhase('reconnecting', {hasJob: true}).explanation).toBe(
      "The server doesn't answer. Asking again."
    );
    expect(describePhase('server_unavailable', {hasJob: true}).explanation).toBe(
      "The server isn't responding. The statement stays on the server as it was."
    );
  });

  it('asks for the file again when its copy vanished', () => {
    expect(describePhase('failed', {}, {reason: 'file_missing'}).explanation).toBe(
      'The file is no longer on this phone, pick it again.'
    );
  });

  it('says a blocked replacement sent nothing', () => {
    expect(describePhase('replacing_previous', {isReplacementBlocked: true}).explanation).toBe(
      'The old statement was not deleted from the server, the new one was not sent.'
    );
  });

  it('shows a polled job that stopped answering as reconnecting, without changing its phase', () => {
    expect(describePhase('processing', {hasJob: true, isPollingSilent: true})).toEqual({
      badgePhase: 'reconnecting',
      explanation: "The server doesn't answer. Asking again.",
      illustration: 'unknown'
    });
    expect(describePhase('ready', {isPollingSilent: true}).badgePhase).toBe('ready');
  });
});

describe('describeDetail', () => {
  it('names the HTTP answer of a refusal', () => {
    expect(describeDetail({reason: 'server_rejected', httpStatus: 422}, EN)).toBe(
      'Server answer: HTTP 422'
    );
  });

  it('says nothing without an HTTP answer', () => {
    expect(describeDetail({reason: 'server_rejected', httpStatus: null}, EN)).toBeNull();
    expect(describeDetail({reason: 'file_missing'}, EN)).toBeNull();
    expect(describeDetail(null, EN)).toBeNull();
  });
});

describe('describeStatementTitle', () => {
  it('builds the generated title, never the file name', () => {
    const titleSource = {
      createdAt: '2026-10-29T13:32:00.000Z',
      file: {sizeBytes: 2458, format: 'pdf'}
    } as const;
    expect(describeStatementTitle(titleSource, LANGUAGE.EN)).toBe(
      'Statement · 29 Oct, 06:32 · PDF · 2.4 KB'
    );
  });

  it('has no title without a statement', () => {
    expect(describeStatementTitle(null, LANGUAGE.EN)).toBeNull();
  });
});
