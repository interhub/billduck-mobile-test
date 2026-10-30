import {Alert, StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {MockCounters, MockState} from '@/src/api/importsApi/mockControlApi';
import {Card} from '@/src/components/ui/Card';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {MainButton} from '@/src/components/ui/MainButton';
import {ResponseTimeline} from '@/src/components/ui/ResponseTimeline';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {ENV} from '@/src/config/env';
import {SPACING} from '@/src/constants/UI_SIZES';
import {Translation} from '@/src/i18n/translations';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {ScenarioPicker} from '@/src/screens/Diagnostics/components/ScenarioPicker';
import {HealthState, useMockDiagnostics} from '@/src/screens/Diagnostics/hooks/useMockDiagnostics';
import {useImportStore} from '@/src/stores/importStore';
import {ImportOperation} from '@/src/types/importOperation';
import {formatExactBytes} from '@/src/utils/format/formatFileSize';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

const COUNTER_KEYS: readonly (keyof MockCounters)[] = [
  'createRequests',
  'newJobs',
  'duplicateHits',
  'acceptedBytes',
  'deleteRequests'
];

const COUNTER_TEST_ID: Record<keyof MockCounters, string> = {
  createRequests: 'diagnostics_create_requests_text',
  newJobs: 'diagnostics_new_jobs_text',
  duplicateHits: 'diagnostics_duplicate_hits_text',
  acceptedBytes: 'diagnostics_accepted_bytes_text',
  deleteRequests: 'diagnostics_delete_requests_text'
};

const describeHealth = (health: HealthState, t: Translation): string => {
  if (health === 'ok') {
    return t.diagnostics.healthOk;
  }
  if (health === 'down') {
    return t.diagnostics.healthDown;
  }
  return t.diagnostics.healthChecking;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section = ({title, children}: SectionProps) => {
  const {styles} = useDiagnosticsScreenStyles();
  return (
    <View style={styles.section}>
      <TextLine variant="label" accessibilityRole="header">
        {title}
      </TextLine>
      {children}
    </View>
  );
};

type ServerDownHintProps = {
  isVisible: boolean;
  text: string;
};

const ServerDownHint = ({isVisible, text}: ServerDownHintProps) => {
  if (!isVisible) {
    return null;
  }
  return <TextLine variant="caption">{text}</TextLine>;
};

type MockJobLinesProps = {
  mockState: MockState | null;
};

const MockJobLines = ({mockState}: MockJobLinesProps) => {
  const {t, language} = useTranslation();
  if (!mockState?.jobs.length) {
    return <TextLine variant="caption">{t.diagnostics.noJobs}</TextLine>;
  }
  const lines = mockState.jobs.map((job) => {
    const jobLine = `${job.jobId} · ${job.status} · r${job.revision} · ${formatExactBytes(job.bytes, language)}`;
    return (
      <TextLine key={job.jobId} variant="money">
        {jobLine}
      </TextLine>
    );
  });
  return <>{lines}</>;
};

type StoredOperationRowsProps = {
  operation: ImportOperation | null;
};

const StoredOperationRows = ({operation}: StoredOperationRowsProps) => {
  const {t} = useTranslation();
  if (!operation) {
    return <TextLine variant="caption">{t.diagnostics.nothingStored}</TextLine>;
  }
  const jobId = operation.jobId ?? t.diagnostics.noValue;
  return (
    <>
      <InfoRow
        label={t.diagnostics.phaseLabel}
        value={operation.phase}
        valueVariant="money"
        testID="diagnostics_phase_text"
      />
      <InfoRow label={t.diagnostics.jobLabel} value={jobId} valueVariant="money" />
      <InfoRow
        label={t.diagnostics.revisionLabel}
        value={String(operation.revision)}
        valueVariant="money"
      />
    </>
  );
};

export const DiagnosticsScreen = () => {
  const {styles} = useDiagnosticsScreenStyles();
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const {health, mockState, isBusy, refresh, switchScenario, resetAll} = useMockDiagnostics();
  const {operation, pendingCleanups, staleSkippedCount, journal} = useImportStore(
    useShallow((state) => ({
      operation: state.operation,
      pendingCleanups: state.pendingCleanups,
      staleSkippedCount: state.staleSkippedCount,
      journal: state.journal
    }))
  );
  const confirmReset = () => {
    Alert.alert(t.diagnostics.resetQuestion, t.diagnostics.resetExplanation, [
      {text: t.common.cancel, style: 'cancel'},
      {text: t.diagnostics.resetAction, style: 'destructive', onPress: () => void resetAll()}
    ]);
  };
  const header = <ScreenHeader onBack={navigation.goBack} testID="diagnostics_back_button" />;
  const isServerDown = health === 'down';
  const counters = COUNTER_KEYS.map((counterKey) => {
    const counterValue = String(mockState?.stats[counterKey] ?? t.diagnostics.noValue);
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
  const footer = (
    <>
      <MainButton
        title={t.diagnostics.refresh}
        variant="secondary"
        onPress={refresh}
        loading={isBusy}
        testID="diagnostics_refresh_button"
      />
      <MainButton
        title={t.diagnostics.resetAll}
        variant="destructive"
        onPress={confirmReset}
        disabled={isBusy}
        testID="diagnostics_reset_button"
      />
    </>
  );
  return (
    <ScreenLayout
      testID="diagnostics_screen"
      header={header}
      footer={footer}
      onRefresh={refresh}
      refreshing={false}
    >
      <TextLine variant="display" accessibilityRole="header">
        {t.diagnostics.title}
      </TextLine>
      <Section title={t.diagnostics.serverSection}>
        <Card>
          <InfoRow
            label={t.diagnostics.addressLabel}
            value={ENV.API_BASE_URL}
            valueVariant="money"
          />
          <InfoRow
            label={t.diagnostics.healthLabel}
            value={describeHealth(health, t)}
            testID="diagnostics_health_text"
          />
          <ServerDownHint isVisible={isServerDown} text={t.diagnostics.serverDownHint} />
        </Card>
      </Section>
      <Section title={t.diagnostics.scenarioSection}>
        <ScenarioPicker
          current={mockState?.mode ?? null}
          isDisabled={isBusy || health !== 'ok'}
          onSelect={switchScenario}
        />
      </Section>
      <Section title={t.diagnostics.countersSection}>
        <Card>{counters}</Card>
      </Section>
      <Section title={t.diagnostics.jobsSection}>
        <View style={styles.jobs}>
          <MockJobLines mockState={mockState} />
        </View>
      </Section>
      <Section title={t.diagnostics.phoneSection}>
        <Card>
          <StoredOperationRows operation={operation} />
          <InfoRow
            label={t.diagnostics.pendingCleanups}
            value={String(pendingCleanups.length)}
            valueVariant="money"
          />
          <InfoRow
            label={t.diagnostics.staleSkipped}
            value={String(staleSkippedCount)}
            valueVariant="money"
            testID="diagnostics_stale_skipped_text"
          />
        </Card>
      </Section>
      <Section title={t.diagnostics.journalSection}>
        <ResponseTimeline
          entries={journal}
          emptyText={t.diagnostics.journalEmpty}
          testID="diagnostics_journal_list"
        />
      </Section>
    </ScreenLayout>
  );
};

const useDiagnosticsScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    section: {
      gap: SPACING.md
    },
    jobs: {
      gap: SPACING.xs
    }
  })
);
