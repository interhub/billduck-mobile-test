import {resolveDraftView} from '@/src/screens/Import/logic/resolveDraftView';
import {ImportDraft} from '@/src/types/importDraft';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';

const buildDraft = (overrides: Partial<ImportDraft>): ImportDraft => ({
  operationId: 'op-2',
  phase: 'confirming',
  originalName: 'Выписка за октябрь.pdf',
  sizeBytes: 2458,
  format: 'pdf',
  rejection: null,
  idempotencyKey: 'key-0000-0002',
  serverFileName: 'statement-20261030-0905.pdf',
  createdAt: '2026-10-30T09:05:00.000Z',
  isReplacementBlocked: false,
  ...overrides
});

describe('resolveDraftView', () => {
  it('shows the check while there is no file or it is being read', () => {
    expect(resolveDraftView(null)).toEqual({kind: 'checking'});
    expect(resolveDraftView(buildDraft({phase: 'validating', format: null}))).toEqual({
      kind: 'checking'
    });
  });

  it('shows why a refused file was refused, with its size', () => {
    const draft = buildDraft({
      phase: 'rejected',
      format: null,
      rejection: STATEMENT_REJECTION.TOO_LARGE,
      sizeBytes: 10485761
    });
    expect(resolveDraftView(draft)).toEqual({
      kind: 'rejected',
      rejection: STATEMENT_REJECTION.TOO_LARGE,
      sizeBytes: 10485761
    });
  });

  it('shows the checked file with its format', () => {
    const draft = buildDraft({format: 'csv'});
    expect(resolveDraftView(draft)).toEqual({kind: 'checked', draft, format: 'csv'});
  });

  it('never guesses a format the check did not find', () => {
    expect(resolveDraftView(buildDraft({format: null}))).toEqual({kind: 'checking'});
  });
});
