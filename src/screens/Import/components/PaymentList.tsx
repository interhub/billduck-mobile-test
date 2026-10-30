import {StyleSheet, View} from 'react-native';
import {BORDER_WIDTH, SPACING} from '@/src/constants/UI_SIZES';
import {PaymentRow} from '@/src/screens/Import/components/PaymentRow';
import {StatementPayments} from '@/src/types/importDraft';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type PaymentListProps = {
  payments: StatementPayments;
  onOpenPayment: (paymentId: string) => void;
};

/** The repeating payments of the report under a thin line, each with "Details". */
export const PaymentList = ({payments, onOpenPayment}: PaymentListProps) => {
  const {styles} = usePaymentListStyles();
  const rows = payments.items.map((payment, position) => {
    const rowTestID = `import_result_payment_row_${payment.id}`;
    return (
      <PaymentRow
        key={payment.id}
        payment={payment}
        currency={payments.currency}
        position={position}
        onPress={onOpenPayment}
        testID={rowTestID}
      />
    );
  });
  return <View style={styles.list}>{rows}</View>;
};

const usePaymentListStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    list: {
      gap: SPACING.xs,
      paddingTop: SPACING.xs,
      borderTopWidth: BORDER_WIDTH,
      borderTopColor: colors.border
    }
  })
);
