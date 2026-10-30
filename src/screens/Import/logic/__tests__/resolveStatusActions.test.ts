import {LANGUAGE, TRANSLATIONS} from '@/src/i18n/translations';
import {
  describeActionTitle,
  resolveStatusActions,
  STATUS_ACTION,
  StatusActionId
} from '@/src/screens/Import/logic/resolveStatusActions';
import {BadgePhase} from '@/src/utils/import/importPhases';

const EN = TRANSLATIONS[LANGUAGE.EN];

const actionsOf = (
  phase: BadgePhase | null,
  {hasJob = false, isReplacementBlocked = false} = {}
): StatusActionId[] => resolveStatusActions({phase, hasJob, isReplacementBlocked});

describe('resolveStatusActions', () => {
  it.each([
    ['queued', ['deleteRunningImport']],
    ['processing', ['deleteRunningImport']],
    ['server_unavailable', ['retry', 'cancelUpload']],
    ['not_received', ['sendAgain', 'cancelUpload']],
    ['failed', ['pickAgain']],
    ['ready', ['openReport']],
    ['delete_failed', ['retry']],
    ['gone_on_server', ['toHome']],
    ['uploading', []],
    ['reconnecting', []],
    ['deleting', []],
    ['deleted', []],
    ['replacing_previous', []]
  ] as const)('offers the actions of the %s phase', (phase, expected) => {
    expect(actionsOf(phase)).toEqual(expected);
  });

  it('offers nothing without an import', () => {
    expect(actionsOf(null)).toEqual([]);
  });

  it('hides "Cancel upload" once the server holds a job', () => {
    expect(actionsOf('server_unavailable', {hasJob: true})).toEqual(['retry']);
  });

  it('offers "Retry" and "Cancel" when the previous statement could not be deleted', () => {
    expect(actionsOf('replacing_previous', {isReplacementBlocked: true})).toEqual([
      'retry',
      'cancelReplacement'
    ]);
  });

  it('keeps at most one yellow button in every phase', () => {
    const phases: BadgePhase[] = [
      'uploading',
      'queued',
      'processing',
      'ready',
      'reconnecting',
      'not_received',
      'server_unavailable',
      'failed',
      'replacing_previous',
      'deleting',
      'delete_failed',
      'deleted',
      'gone_on_server'
    ];
    for (const phase of phases) {
      const actions = actionsOf(phase, {isReplacementBlocked: true});
      const primaryActions = actions.filter(
        (actionId) => STATUS_ACTION[actionId].variant === 'primary'
      );
      expect(primaryActions.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('describeActionTitle', () => {
  it('asks for the same file again when its copy vanished', () => {
    expect(describeActionTitle('pickAgain', {reason: 'file_missing'}, EN)).toBe(
      'Choose the file again'
    );
  });

  it('asks for another file when the server refused this one', () => {
    const failure = {reason: 'server_rejected', httpStatus: 422} as const;
    expect(describeActionTitle('pickAgain', failure, EN)).toBe('Choose another file');
  });

  it('names the quiet cancel of a running import with the status screen word', () => {
    expect(describeActionTitle('deleteRunningImport', null, EN)).toBe('Cancel');
  });
});
