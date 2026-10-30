import {StyleSheet, View} from 'react-native';
import {MockState} from '@/src/api/importsApi/mockControlApi';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {formatExactBytes} from '@/src/utils/format/formatFileSize';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

const JOB_LINE_SEPARATOR = ' · ';

type MockJob = MockState['jobs'][number];

type MockJobLineProps = {
  job: MockJob;
};

const MockJobLine = ({job}: MockJobLineProps) => {
  const {t, language} = useTranslation();
  const jobLine = [
    job.jobId,
    job.status,
    t.timeline.revision(job.revision),
    formatExactBytes(job.bytes, language)
  ].join(JOB_LINE_SEPARATOR);
  return <TextLine variant="money">{jobLine}</TextLine>;
};

type MockJobLinesProps = {
  mockState: MockState | null;
};

/** The jobs the mock holds, one line each: id, status, revision and size. */
export const MockJobLines = ({mockState}: MockJobLinesProps) => {
  const {styles} = useMockJobLinesStyles();
  const {t} = useTranslation();
  if (!mockState?.jobs.length) {
    return (
      <View style={styles.jobs}>
        <TextLine variant="caption">{t.diagnostics.noJobs}</TextLine>
      </View>
    );
  }
  const lines = mockState.jobs.map((job) => <MockJobLine key={job.jobId} job={job} />);
  return <View style={styles.jobs}>{lines}</View>;
};

const useMockJobLinesStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    jobs: {
      gap: SPACING.xs
    }
  })
);
