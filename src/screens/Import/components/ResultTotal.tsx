import {StyleSheet, View} from 'react-native';
import {MonthlyTotal} from '@/src/components/ui/MonthlyTotal';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {StatementPayments} from '@/src/types/importDraft';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ResultTotalProps = {
  payments: StatementPayments;
};

/** "Total per month" over the large monthly total and the count of the payments. */
export const ResultTotal = ({payments}: ResultTotalProps) => {
  const {styles} = useResultTotalStyles();
  const {t} = useTranslation();
  return (
    <View style={styles.lines}>
      <TextLine variant="caption">{t.importResult.totalLabel}</TextLine>
      <MonthlyTotal
        payments={payments}
        variant="moneyLarge"
        style={styles.lines}
        testID="import_result_total_text"
      />
    </View>
  );
};

const useResultTotalStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    lines: {
      gap: SPACING.xs
    }
  })
);
