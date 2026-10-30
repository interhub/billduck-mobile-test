import {MOCK_READY_BODY} from '@/src/api/importsApi/__tests__/mockReadyReport';
import {readImportJob} from '@/src/api/importsApi/readImportJob';

describe('readImportJob', () => {
  it('reads a ready job with its payments', () => {
    expect(readImportJob(MOCK_READY_BODY)?.items).toHaveLength(2);
  });

  it('refuses a ready job without payments or currency, an unknown status and broken JSON', () => {
    expect(
      readImportJob(JSON.stringify({jobId: 'job-demo-001', status: 'ready', revision: 3}))
    ).toBeNull();
    expect(
      readImportJob(JSON.stringify({jobId: 'job-demo-001', status: 'done', revision: 3}))
    ).toBeNull();
    expect(readImportJob('{')).toBeNull();
  });
});
