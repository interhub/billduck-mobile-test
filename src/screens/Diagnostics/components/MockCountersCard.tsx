import {MOCK_COUNTER_KEYS, MockCounters} from '@/src/api/importsApi/mockControlApi';
import {Card} from '@/src/components/ui/Card';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {useTranslation} from '@/src/i18n/useTranslation';

const COUNTER_TEST_ID: Record<keyof MockCounters, string> = {
  createRequests: 'diagnostics_create_requests_text',
  newJobs: 'diagnostics_new_jobs_text',
  duplicateHits: 'diagnostics_duplicate_hits_text',
  acceptedBytes: 'diagnostics_accepted_bytes_text',
  deleteRequests: 'diagnostics_delete_requests_text'
};

type MockCountersCardProps = {
  counters: MockCounters | null;
};

/** The `/__test/state` counters; a dash for each while the mock does not answer. */
export const MockCountersCard = ({counters}: MockCountersCardProps) => {
  const {t} = useTranslation();
  const rows = MOCK_COUNTER_KEYS.map((counterKey) => {
    const counterValue = String(counters?.[counterKey] ?? t.diagnostics.noValue);
    return (
      <InfoRow
        key={counterKey}
        label={t.diagnostics.counter[counterKey]}
        value={counterValue}
        valueVariant="money"
        testID={COUNTER_TEST_ID[counterKey]}
      />
    );
  });
  return <Card>{rows}</Card>;
};
