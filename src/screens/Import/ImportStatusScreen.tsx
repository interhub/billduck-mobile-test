import {useShallow} from 'zustand/react/shallow';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useImportSubject} from '@/src/hooks/import/useImportSubject';
import {useStatusRefresh} from '@/src/hooks/import/useStatusRefresh';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {ReadySummary} from '@/src/screens/Import/components/ReadySummary';
import {StatusActions} from '@/src/screens/Import/components/StatusActions';
import {StatusHero} from '@/src/screens/Import/components/StatusHero';
import {StatusTimeline} from '@/src/screens/Import/components/StatusTimeline';
import {useStatusActionHandlers} from '@/src/screens/Import/hooks/useStatusActionHandlers';
import {useStatusRedirect} from '@/src/screens/Import/hooks/useStatusRedirect';
import {
  describeDetail,
  describeImportStatus,
  describeStatementTitle
} from '@/src/screens/Import/logic/describeImportStatus';
import {useImportStore} from '@/src/stores/importStore';

export const ImportStatusScreen = () => {
  const {t, language} = useTranslation();
  const navigation = useAppNavigation();
  const subject = useImportSubject();
  const {payments, isPollingSilent, failure} = useImportStore(
    useShallow((state) => ({
      payments: state.payments,
      isPollingSilent: state.isPollingSilent,
      failure: state.operation?.failure ?? null
    }))
  );
  const {isRefreshing, refresh} = useStatusRefresh();
  const handlers = useStatusActionHandlers();
  useStatusRedirect(subject.outcome);
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_status_back_button" />;
  const title = (
    <TextLine variant="display" accessibilityRole="header">
      {t.importStatus.title}
    </TextLine>
  );
  if (!subject.phase) {
    return (
      <ScreenLayout testID="import_status_screen" header={header}>
        {title}
        <TextLine>{t.common.noStatements}</TextLine>
      </ScreenLayout>
    );
  }
  const description = describeImportStatus(
    {
      phase: subject.phase,
      hasJob: subject.hasJob,
      isPollingSilent,
      isReplacementBlocked: subject.isReplacementBlocked,
      failure
    },
    t
  );
  const statementTitle = describeStatementTitle(subject.titleSource, language);
  const detail = describeDetail(failure, t);
  const footer = <StatusActions subject={subject} failure={failure} handlers={handlers} />;
  return (
    <ScreenLayout
      testID="import_status_screen"
      header={header}
      footer={footer}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      {title}
      <StatusHero description={description} title={statementTitle} detail={detail} />
      <ReadySummary phase={subject.phase} payments={payments} />
      <StatusTimeline />
    </ScreenLayout>
  );
};
