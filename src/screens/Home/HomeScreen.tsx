import {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {Illustration} from '@/src/components/ui/Illustration';
import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {ImportSubject, useImportSubject} from '@/src/hooks/import/useImportSubject';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {CurrentImportCard} from '@/src/screens/Home/components/CurrentImportCard';
import {HomeHeader} from '@/src/screens/Home/components/HomeHeader';
import {HomeNotices} from '@/src/screens/Home/components/HomeNotices';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';
import {StatementPayments} from '@/src/types/importDraft';
import {canAddStatement} from '@/src/utils/import/canAddStatement';
import {isReplacingPrevious} from '@/src/utils/import/importPhases';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type HomeContentProps = {
  isEmpty: boolean;
  subject: ImportSubject;
  payments: StatementPayments | null;
  onOpenCurrentImport: () => void;
};

/** The empty state with its picture, or the card of the current import. */
const HomeContent = ({isEmpty, subject, payments, onOpenCurrentImport}: HomeContentProps) => {
  const {styles} = useHomeScreenStyles();
  const {t} = useTranslation();
  if (isEmpty) {
    return (
      <View style={styles.empty}>
        <Illustration name="empty" />
        <TextLine>{t.home.empty}</TextLine>
      </View>
    );
  }
  return <CurrentImportCard subject={subject} payments={payments} onPress={onOpenCurrentImport} />;
};

type AddBlockedCaptionProps = {
  isVisible: boolean;
  text: string;
};

const AddBlockedCaption = ({isVisible, text}: AddBlockedCaptionProps) => {
  if (!isVisible) {
    return null;
  }
  return (
    <TextLine variant="caption" align="center" testID="home_add_blocked_text">
      {text}
    </TextLine>
  );
};

export const HomeScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const subject = useImportSubject();
  const {operation, draft, payments, pendingCleanups} = useImportStore(
    useShallow((state) => ({
      operation: state.operation,
      draft: state.draft,
      payments: state.payments,
      pendingCleanups: state.pendingCleanups
    }))
  );
  const [isPicking, setIsPicking] = useState(false);
  const isAddingAllowed = canAddStatement(operation, draft);
  const isEmpty = !operation && !isReplacingPrevious(draft);
  const addStatement = async () => {
    setIsPicking(true);
    try {
      const isPicked = await importController.pickFile();
      if (isPicked) {
        navigation.navigate(SCREEN_NAME.IMPORT_CONFIRM);
      }
    } finally {
      setIsPicking(false);
    }
  };
  const openCurrentImport = () => {
    if (subject.phase === 'ready') {
      navigation.navigate(SCREEN_NAME.IMPORT_RESULT);
      return;
    }
    navigation.navigate(SCREEN_NAME.IMPORT_STATUS);
  };
  const openDiagnostics = () => navigation.navigate(SCREEN_NAME.DIAGNOSTICS);
  const checkServer = () => {
    void importController.runCleanups();
  };
  const footer = (
    <>
      <MainButton
        title={t.home.addStatement}
        onPress={addStatement}
        loading={isPicking}
        disabled={!isAddingAllowed}
        testID="home_add_statement_button"
      />
      <AddBlockedCaption isVisible={!isAddingAllowed} text={t.home.addStatementBlocked} />
      <MainButton
        title={t.home.diagnostics}
        variant="quiet"
        onPress={openDiagnostics}
        testID="home_diagnostics_link"
      />
    </>
  );
  return (
    <ScreenLayout testID="home_screen" footer={footer}>
      <HomeHeader />
      <HomeNotices
        hasPendingCleanups={pendingCleanups.length > 0}
        outcome={subject.outcome}
        onCheckServer={checkServer}
      />
      <HomeContent
        isEmpty={isEmpty}
        subject={subject}
        payments={payments}
        onOpenCurrentImport={openCurrentImport}
      />
    </ScreenLayout>
  );
};

const useHomeScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    empty: {
      gap: SPACING.xl,
      paddingTop: SPACING.lg
    }
  })
);
