import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {Card} from '@/src/components/ui/Card';
import {MainButton} from '@/src/components/ui/MainButton';
import {PaymentRow} from '@/src/components/ui/PaymentRow';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {StatusBadge, toBadgePhase} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {PAYMENT_DOT_COLORS} from '@/src/constants/UI_COLORS';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';
import {formatLocalTime} from '@/src/utils/format/formatDate';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';
import {TIMELINE_EVENT} from '@/src/utils/import/importTimeline';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const confirmDelete = () => {
    Alert.alert(t.importResult.deleteQuestion, t.importResult.deleteExplanation, [
      {text: t.common.cancel, style: 'cancel'},
      {
        text: t.importResult.deleteAction,
        style: 'destructive',
        onPress: () => {
          void importController.deleteImport();
          navigation.navigate(SCREEN_NAME.IMPORT_STATUS);
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
    const badgePhase = operation ? toBadgePhase(operation.phase) : null;
    const badge = badgePhase ? <StatusBadge phase={badgePhase} /> : null;
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
        {badge}
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
      onPress={() => navigation.navigate(SCREEN_NAME.PAYMENT_DETAILS, {paymentId: paymentItem.id})}
      testID={`import_result_payment_row_${paymentItem.id}`}
    />
  ));
  const staleNote = isStaleSkipped ? (
    <TextLine variant="caption" testID="import_result_stale_text">
      {t.importResult.staleSkipped}
    </TextLine>
  ) : null;
  const checkedAt = lastAnswerAt ? (
    <TextLine variant="caption">{t.importResult.checkedAt(formatLocalTime(lastAnswerAt))}</TextLine>
  ) : null;
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
      <Card>
        <TextLine variant="caption">{t.importResult.totalLabel}</TextLine>
        <TextLine variant="moneyLarge" testID="import_result_total_text">
          {formatMonthlyTotal(payments.items, payments.currency, language)}
        </TextLine>
        <TextLine variant="caption">{t.home.repeatingPayments(payments.items.length)}</TextLine>
      </Card>
      <View style={styles.list}>{rows}</View>
      {staleNote}
      <View style={styles.meta}>
        {checkedAt}
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

const useImportResultScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    list: {
      gap: SPACING.xs
    },
    meta: {
      gap: SPACING.md
    }
  })
);
