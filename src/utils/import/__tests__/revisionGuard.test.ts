import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {JOB_ANSWER_VERDICT, judgeJobAnswer} from '@/src/utils/import/revisionGuard';

describe('judgeJobAnswer', () => {
  it('applies a newer revision', () => {
    expect(
      judgeJobAnswer(
        {revision: 1, hasItems: false},
        {status: IMPORT_STATUS.PROCESSING, revision: 2}
      )
    ).toBe(JOB_ANSWER_VERDICT.APPLY);
  });

  it('skips processing r2 that arrives after ready r3', () => {
    expect(
      judgeJobAnswer({revision: 3, hasItems: true}, {status: IMPORT_STATUS.PROCESSING, revision: 2})
    ).toBe(JOB_ANSWER_VERDICT.STALE);
  });

  it('keeps the same revision unchanged', () => {
    expect(
      judgeJobAnswer({revision: 3, hasItems: true}, {status: IMPORT_STATUS.READY, revision: 3})
    ).toBe(JOB_ANSWER_VERDICT.SAME);
  });

  it('takes ready with the same revision when the phone has no payments after a restart', () => {
    expect(
      judgeJobAnswer({revision: 3, hasItems: false}, {status: IMPORT_STATUS.READY, revision: 3})
    ).toBe(JOB_ANSWER_VERDICT.APPLY);
  });

  it('does not let the restart exception apply to an older ready', () => {
    expect(
      judgeJobAnswer({revision: 4, hasItems: false}, {status: IMPORT_STATUS.READY, revision: 3})
    ).toBe(JOB_ANSWER_VERDICT.STALE);
  });
});
