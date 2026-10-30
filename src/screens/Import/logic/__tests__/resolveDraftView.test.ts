import {LIMITS} from '@/src/constants/LIMITS';
import {resolveDraftView} from '@/src/screens/Import/logic/resolveDraftView';
import {CheckingDraft, ConfirmedDraft, ImportDraft} from '@/src/types/importDraft';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';

const PICKED_FILE = {
  operationId: 'op-2',
  originalName: 'Выписка за октябрь.pdf',
  sizeBytes: 2458,
  createdAt: '2026-10-30T09:05:00.000Z',
  isReplacementBlocked: false
};

const CHECKING_DRAFT: CheckingDraft = {
  ...PICKED_FILE,
  phase: 'validating',
  format: null,
  rejection: null,
  idempotencyKey: null,
  serverFileName: null
};

const CONFIRMED_DRAFT: ConfirmedDraft = {
  ...PICKED_FILE,
  phase: 'confirming',
  format: 'csv',
  rejection: null,
  idempotencyKey: 'key-0000-0002',
  serverFileName: 'statement-20261030-0905.csv'
};

describe('resolveDraftView', () => {
  it('shows the check while there is no file or it is being read', () => {
    expect(resolveDraftView(null)).toEqual({kind: 'checking'});
    expect(resolveDraftView(CHECKING_DRAFT)).toEqual({kind: 'checking'});
  });

  it('shows why a refused file was refused, with its size', () => {
    const oversizeBytes = LIMITS.MAX_FILE_SIZE_BYTES + 1;
    const draft: ImportDraft = {
      ...CHECKING_DRAFT,
      phase: 'rejected',
      rejection: STATEMENT_REJECTION.TOO_LARGE,
      sizeBytes: oversizeBytes
    };
    expect(resolveDraftView(draft)).toEqual({
      kind: 'rejected',
      rejection: STATEMENT_REJECTION.TOO_LARGE,
      sizeBytes: oversizeBytes
    });
  });

  it('shows the checked file with its format', () => {
    expect(resolveDraftView(CONFIRMED_DRAFT)).toEqual({
      kind: 'checked',
      draft: CONFIRMED_DRAFT,
      format: 'csv'
    });
  });
});
