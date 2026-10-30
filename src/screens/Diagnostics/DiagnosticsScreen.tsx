import {ResponseTimeline} from '@/src/components/ui/ResponseTimeline';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {DiagnosticsActions} from '@/src/screens/Diagnostics/components/DiagnosticsActions';
import {DiagnosticsSection} from '@/src/screens/Diagnostics/components/DiagnosticsSection';
import {MockCountersCard} from '@/src/screens/Diagnostics/components/MockCountersCard';
import {MockJobLines} from '@/src/screens/Diagnostics/components/MockJobLines';
import {PhoneStateCard} from '@/src/screens/Diagnostics/components/PhoneStateCard';
import {ScenarioPicker} from '@/src/screens/Diagnostics/components/ScenarioPicker';
import {ServerHealthCard} from '@/src/screens/Diagnostics/components/ServerHealthCard';
import {useMockDiagnostics} from '@/src/screens/Diagnostics/hooks/useMockDiagnostics';
import {useImportStore} from '@/src/stores/importStore';

export const DiagnosticsScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const {health, mockState, isBusy, refresh, switchScenario, resetAll} = useMockDiagnostics();
  const journal = useImportStore((state) => state.journal);
  const currentScenario = mockState?.mode ?? null;
  const counters = mockState?.stats ?? null;
  const isScenarioLocked = isBusy || health !== 'ok';
  const header = <ScreenHeader onBack={navigation.goBack} testID="diagnostics_back_button" />;
  const footer = <DiagnosticsActions isBusy={isBusy} onRefresh={refresh} onResetAll={resetAll} />;
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
      <DiagnosticsSection title={t.diagnostics.serverSection}>
        <ServerHealthCard health={health} />
      </DiagnosticsSection>
      <DiagnosticsSection title={t.diagnostics.scenarioSection}>
        <ScenarioPicker
          current={currentScenario}
          isDisabled={isScenarioLocked}
          onSelect={switchScenario}
        />
      </DiagnosticsSection>
      <DiagnosticsSection title={t.diagnostics.countersSection}>
        <MockCountersCard counters={counters} />
      </DiagnosticsSection>
      <DiagnosticsSection title={t.diagnostics.jobsSection}>
        <MockJobLines mockState={mockState} />
      </DiagnosticsSection>
      <DiagnosticsSection title={t.diagnostics.phoneSection}>
        <PhoneStateCard />
      </DiagnosticsSection>
      <DiagnosticsSection title={t.diagnostics.journalSection}>
        <ResponseTimeline
          entries={journal}
          emptyText={t.diagnostics.journalEmpty}
          testID="diagnostics_journal_list"
        />
      </DiagnosticsSection>
    </ScreenLayout>
  );
};
