import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {MainButton} from '@/src/components/ui/MainButton';
import {PaymentRow} from '@/src/components/ui/PaymentRow';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {StatusBadge, toBadgePhase} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {PAYMENT_DOT_COLORS} from '@/src/constants/UI_COLORS';
import {BORDER_WIDTH, SPACING} from '@/src/constants/UI_SIZES';
import {useImportSubject} from '@/src/hooks/import/useImportSubject';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';
import {ImportOperation} from '@/src/types/importOperation';
import {formatLocalTime} from '@/src/utils/format/formatDate';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type OperationBadgeProps = {
  operation: ImportOperation | null;
};

const OperationBadge = ({operation}: OperationBadgeProps) => {
  if (!operation) {
    return null;
  }
  const badgePhase = toBadgePhase(operation.phase);
  if (!badgePhase) {
    return null;
  }
  return <StatusBadge phase={badgePhase} />;
};

type StaleNoteProps = {
  isVisible: boolean;
  text: string;
};

const StaleNote = ({isVisible, text}: StaleNoteProps) => {
  if (!isVisible) {
    return null;
  }
  return (
    <TextLine variant="caption" testID="import_result_stale_text">
      {text}
    </TextLine>
  );
};

type CheckedAtLineProps = {
  lastAnswerAt: string | null;
};

const CheckedAtLine = ({lastAnswerAt}: CheckedAtLineProps) => {
  const {t} = useTranslation();
  if (!lastAnswerAt) {
    return null;
  }
  return (
    <TextLine variant="caption">{t.importResult.checkedAt(formatLocalTime(lastAnswerAt))}</TextLine>
  );
};

export const ImportResultScreen = () => {
  const {styles} = useImportResultScreenStyles();
  const colors = useThemeColors();
  const {t, language} = useTranslation();
  const navigation = useAppNavigation();
  const {operation, payments, lastAnswerAt, timeline} = useImportStore(
    useShallow((state) => ({
      operation: state.operation,
      payments: state.payments,
      lastAnswerAt: state.lastAnswerAt,
      timeline: state.timeline
    }))
  );
  const subject = useImportSubject();
  const isFocused = useIsFocused();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // The report exists only while the statement is ready: a deletion, a job the server no longer
  // knows or any other phase is told by the status screen, and nothing at all sends the person home.
  useEffect(() => {
    if (!isFocused || subject.phase === 'ready') {
      return;
    }
    if (!subject.phase) {
      navigation.popTo(SCREEN_NAME.HOME);
      return;
    }
    navigation.replace(SCREEN_NAME.IMPORT_STATUS);
  }, [isFocused, subject.phase, navigation]);
  // Opening the report reads the status once more, so an older answer can show up and be skipped.
  useFocusEffect(
    useCallback(() => {
      void importController.refreshStatus();
    }, [])
  );
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await importController.refreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };
  const openStatus = () => navigation.navigate(SCREEN_NAME.IMPORT_STATUS);
  const openPaymentDetails = (paymentId: string) =>
    navigation.navigate(SCREEN_NAME.PAYMENT_DETAILS, {paymentId});
  const confirmDelete = () => {
    Alert.alert(t.importResult.deleteQuestion, t.importResult.deleteExplanation, [
      {text: t.common.cancel, style: 'cancel'},
      {
        text: t.importResult.deleteAction,
        style: 'destructive',
        onPress: () => {
          void importController.deleteImport();
        }
      }
    ]);
  };
  const header = <ScreenHeader onBack={navigation.goBack} testID="import_result_back_button" />;
  const isStaleSkipped = timeline.some(
    (entry) =>
      entry.event === TIMELINE_EVENT.STATUS_STALE_SKIPPED &&
      entry.operationId === operation?.operationId
  );
  if (!payments || !operation) {
    return (
      <ScreenLayout
        testID="import_result_screen"
        header={header}
        onRefresh={refresh}
        refreshing={isRefreshing}
      >
        <TextLine variant="display" accessibilityRole="header">
          {t.importResult.title}
        </TextLine>
        <OperationBadge operation={operation} />
        <ActivityIndicator color={colors.textMuted} />
        <TextLine>{t.importResult.loadingPayments}</TextLine>
      </ScreenLayout>
    );
  }
  const rows = payments.items.map((paymentItem, index) => (
    <PaymentRow
      key={paymentItem.id}
      item={paymentItem}
      currency={payments.currency}
      dotColor={PAYMENT_DOT_COLORS[index % PAYMENT_DOT_COLORS.length]}
      onPress={openPaymentDetails}
      testID={`import_result_payment_row_${paymentItem.id}`}
    />
  ));
  const footer = (
    <MainButton
      title={t.importResult.deleteImport}
      variant="destructive"
      onPress={confirmDelete}
      testID="import_result_delete_button"
    />
  );
  return (
    <ScreenLayout
      testID="import_result_screen"
      header={header}
      footer={footer}
      onRefresh={refresh}
      refreshing={isRefreshing}
    >
      <TextLine variant="display" accessibilityRole="header">
        {t.importResult.title}
      </TextLine>
      <View style={styles.total}>
        <TextLine variant="caption">{t.importResult.totalLabel}</TextLine>
        <TextLine variant="moneyLarge" testID="import_result_total_text">
          {formatMonthlyTotal(payments.items, payments.currency, language)}
        </TextLine>
        <TextLine variant="caption">{t.home.repeatingPayments(payments.items.length)}</TextLine>
      </View>
      <View style={styles.list}>{rows}</View>
      <StaleNote isVisible={isStaleSkipped} text={t.importResult.staleSkipped} />
      <View style={styles.meta}>
        <CheckedAtLine lastAnswerAt={lastAnswerAt} />
        <MainButton
          title={t.importResult.serverAnswers}
          variant="secondary"
          onPress={openStatus}
          testID="import_result_status_link"
        />
      </View>
    </ScreenLayout>
  );
};

const useImportResultScreenStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    total: {
      gap: SPACING.xs
    },
    list: {
      gap: SPACING.xs,
      paddingTop: SPACING.xs,
      borderTopWidth: BORDER_WIDTH,
      borderTopColor: colors.border
    },
    meta: {
      gap: SPACING.md
    }
  })
);
