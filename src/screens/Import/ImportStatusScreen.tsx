import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {MainButton} from '@/src/components/ui/MainButton';
import {ResponseTimeline} from '@/src/components/ui/ResponseTimeline';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {ImportSubject, useImportSubject} from '@/src/hooks/import/useImportSubject';
import {LANGUAGE} from '@/src/i18n/translations';
import {Translation} from '@/src/i18n/translationsEn';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {ReadySummary} from '@/src/screens/Import/components/ReadySummary';
import {StatusHero} from '@/src/screens/Import/components/StatusHero';
import {describeImportStatus} from '@/src/screens/Import/logic/describeImportStatus';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';
import {StatementPayments} from '@/src/types/importDraft';
import {ImportFailure} from '@/src/types/importOperation';
import {formatStatementTitle} from '@/src/utils/format/formatStatementTitle';
import {BadgePhase} from '@/src/utils/import/importPhases';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type StatusActionHandlers = {
  retry: () => void;
  sendAgain: () => void;
  cancelUpload: () => void;
  cancelImport: () => void;
  cancelReplacement: () => void;
  openReport: () => void;
  pickAgain: () => void;
  toHome: () => void;
};

/** A copy that vanished asks for the same file again; a refused file asks for another one. */
const describePickAgain = (failure: ImportFailure | null, t: Translation): string => {
  if (failure?.reason === 'file_missing') {
    return t.importStatus.pickAgain;
  }
  return t.importConfirm.chooseAnother;
};

type CancelUploadButtonProps = {
  hasJob: boolean;
  title: string;
  onPress: () => void;
};

/** An upload can be cancelled only while the server has no job for it. */
const CancelUploadButton = ({hasJob, title, onPress}: CancelUploadButtonProps) => {
  if (hasJob) {
    return null;
  }
  return (
    <MainButton
      title={title}
      variant="quiet"
      onPress={onPress}
      testID="import_status_cancel_upload_button"
    />
  );
};

type StatusActionsProps = {
  subject: ImportSubject;
  failure: ImportFailure | null;
  handlers: StatusActionHandlers;
  t: Translation;
};

/** The actions of the current phase: one yellow button at most, the rest quiet. */
const StatusActions = ({subject, failure, handlers, t}: StatusActionsProps) => {
  switch (subject.phase) {
    case 'queued':
    case 'processing':
      return (
        <MainButton
          title={t.importStatus.cancelImport}
          variant="quiet"
          onPress={handlers.cancelImport}
          testID="import_status_cancel_button"
        />
      );
    case 'server_unavailable':
      return (
        <>
          <MainButton
            title={t.common.retry}
            onPress={handlers.retry}
            testID="import_status_retry_button"
          />
          <CancelUploadButton
            hasJob={subject.hasJob}
            title={t.importStatus.cancelUpload}
            onPress={handlers.cancelUpload}
          />
        </>
      );
    case 'not_received':
      return (
        <>
          <MainButton
            title={t.importStatus.sendAgain}
            onPress={handlers.sendAgain}
            testID="import_status_send_again_button"
          />
          <MainButton
            title={t.importStatus.cancelUpload}
            variant="quiet"
            onPress={handlers.cancelUpload}
            testID="import_status_cancel_upload_button"
          />
        </>
      );
    case 'failed':
      return (
        <MainButton
          title={describePickAgain(failure, t)}
          onPress={handlers.pickAgain}
          testID="import_status_pick_again_button"
        />
      );
    case 'ready':
      return (
        <MainButton
          title={t.importStatus.openReport}
          onPress={handlers.openReport}
          testID="import_status_open_report_button"
        />
      );
    case 'replacing_previous':
      if (!subject.isReplacementBlocked) {
        return null;
      }
      return (
        <>
          <MainButton
            title={t.common.retry}
            onPress={handlers.retry}
            testID="import_status_retry_button"
          />
          <MainButton
            title={t.common.cancel}
            variant="quiet"
            onPress={handlers.cancelReplacement}
            testID="import_status_cancel_button"
          />
        </>
      );
    case 'delete_failed':
      return (
        <MainButton
          title={t.common.retry}
          onPress={handlers.retry}
          testID="import_status_retry_button"
        />
      );
    case 'gone_on_server':
      return (
        <MainButton
          title={t.importStatus.toHome}
          onPress={handlers.toHome}
          testID="import_status_home_button"
        />
      );
    default:
      return null;
  }
};

const describeDetail = (failure: ImportFailure | null, t: Translation): string | null => {
  if (failure?.reason !== 'server_rejected' || failure.httpStatus === null) {
    return null;
  }
  return t.importStatus.serverAnswer(failure.httpStatus);
};

const describeTitle = (subject: ImportSubject, language: LANGUAGE): string | null => {
  if (!subject.titleSource) {
    return null;
  }
  return formatStatementTitle(subject.titleSource, language);
};

type ReadyPaymentsProps = {
  phase: BadgePhase;
  payments: StatementPayments | null;
};

const ReadyPayments = ({phase, payments}: ReadyPaymentsProps) => {
  if (phase !== 'ready' || !payments) {
    return null;
  }
  return <ReadySummary payments={payments} />;
};

export const ImportStatusScreen = () => {
  const {styles} = useImportStatusScreenStyles();
  const {t, language} = useTranslation();
  const navigation = useAppNavigation();
  const subject = useImportSubject();
  const {timeline, payments, isPollingSilent, failure} = useImportStore(
    useShallow((state) => ({
      timeline: state.timeline,
      payments: state.payments,
      isPollingSilent: state.isPollingSilent,
      failure: state.operation?.failure ?? null
    }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  // "Deleted" is confirmed by the server: the import is over, the main screen says so.
  useEffect(() => {
    if (subject.outcome?.kind === 'deleted') {
      navigation.popTo(SCREEN_NAME.HOME);
    }
  }, [subject.outcome, navigation]);
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await importController.refreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };
  const toHome = () => navigation.popTo(SCREEN_NAME.HOME);
  const handlers: StatusActionHandlers = {
    retry: () => {
      void importController.retry();
    },
    sendAgain: () => {
      void importController.sendAgain();
    },
    cancelUpload: async () => {
      await importController.cancelUpload();
      toHome();
    },
    cancelImport: () => {
      void importController.deleteImport();
    },
    cancelReplacement: () => {
      importController.cancelDraft();
      toHome();
    },
    openReport: () => navigation.popTo(SCREEN_NAME.IMPORT_RESULT),
    pickAgain: async () => {
      const isPicked = await importController.pickFile();
      if (isPicked) {
        navigation.replace(SCREEN_NAME.IMPORT_CONFIRM);
      }
    },
    toHome
  };
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_status_back_button" />;
  if (!subject.phase) {
    return (
      <ScreenLayout testID="import_status_screen" header={header}>
        <TextLine variant="display" accessibilityRole="header">
          {t.importStatus.title}
        </TextLine>
        <TextLine>{t.home.empty}</TextLine>
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
  const title = describeTitle(subject, language);
  const footer = <StatusActions subject={subject} failure={failure} handlers={handlers} t={t} />;
  return (
    <ScreenLayout
      testID="import_status_screen"
      header={header}
      footer={footer}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      <TextLine variant="display" accessibilityRole="header">
        {t.importStatus.title}
      </TextLine>
      <StatusHero description={description} title={title} detail={describeDetail(failure, t)} />
      <ReadyPayments phase={subject.phase} payments={payments} />
      <View style={styles.timeline}>
        <TextLine variant="label">{t.importStatus.timelineTitle}</TextLine>
        <ResponseTimeline
          entries={timeline}
          emptyText={t.importStatus.timelineEmpty}
          testID="import_status_timeline_list"
        />
      </View>
    </ScreenLayout>
  );
};

const useImportStatusScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    timeline: {
      gap: SPACING.md
    }
  })
);
