import {CaretRightIcon} from 'phosphor-react-native/src/icons/CaretRight';
import {StyleSheet, View} from 'react-native';
import {ICON_SIZE, PAYMENT_DOT_SIZE, SPACING, TOUCH_TARGET} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {Translation} from '@/src/i18n/translations';
import {useTranslation} from '@/src/i18n/useTranslation';
import {RecurringItem} from '@/src/types/importApi';
import {formatCalendarDate} from '@/src/utils/format/formatDate';
import {formatMoney} from '@/src/utils/format/formatMoney';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** "Monthly" / "Ежемесячно" for the cadences the app knows, the server word otherwise. */
export const describeCadence = (cadence: string, t: Translation): string => {
  const known = t.importResult.cadence;
  if (cadence === 'monthly' || cadence === 'weekly' || cadence === 'yearly') {
    return known[cadence];
  }
  return cadence;
};

type PaymentRowProps = {
  item: RecurringItem;
  currency: string;
  dotColor: string;
  onPress: (paymentId: string) => void;
  testID: string;
};

/** One recurring payment: color dot with the merchant, cadence, last charge, amount, and "Details". */
export const PaymentRow = ({item, currency, dotColor, onPress, testID}: PaymentRowProps) => {
  const {styles, colors} = usePaymentRowStyles();
  const {t, language} = useTranslation();
  const amount = formatMoney(item.amountMinor, currency, language);
  const cadence = describeCadence(item.cadence, t);
  const lastCharge = t.importResult.lastCharge(formatCalendarDate(item.lastSeen, language));
  const openDetails = () => onPress(item.id);
  return (
    <View testID={testID} collapsable={false}>
      <TouchableScaleView
        onPress={openDetails}
        accessibilityRole="button"
        accessibilityLabel={t.importResult.paymentLabel(item.merchant, amount, cadence)}
        accessibilityHint={t.importResult.details}
        style={styles.row}
      >
        <View style={styles.texts}>
          <View style={styles.merchantLine}>
            <View style={[styles.dot, {backgroundColor: dotColor}]} />
            <TextLine variant="label" style={styles.merchant}>
              {item.merchant}
            </TextLine>
          </View>
          <TextLine variant="caption">{cadence}</TextLine>
          <TextLine variant="caption">{lastCharge}</TextLine>
        </View>
        <View style={styles.trailing}>
          <TextLine variant="money" align="right">
            {amount}
          </TextLine>
          <View style={styles.detailsLine}>
            <TextLine variant="caption">{t.importResult.details}</TextLine>
            <CaretRightIcon size={ICON_SIZE.sm} color={colors.textMuted} weight="regular" />
          </View>
        </View>
      </TouchableScaleView>
    </View>
  );
};

const usePaymentRowStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    row: {
      minHeight: TOUCH_TARGET,
      flexWrap: 'wrap',
      gap: SPACING.md,
      paddingVertical: SPACING.md
    },
    texts: {
      flex: 1,
      minWidth: 140,
      gap: SPACING.xs / 2
    },
    merchantLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm
    },
    dot: {
      width: PAYMENT_DOT_SIZE,
      height: PAYMENT_DOT_SIZE,
      borderRadius: PAYMENT_DOT_SIZE / 2
    },
    merchant: {
      flexShrink: 1
    },
    trailing: {
      alignItems: 'flex-end',
      gap: SPACING.xs
    },
    detailsLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs
    }
  })
);
