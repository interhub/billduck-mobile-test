import {CaretRightIcon} from 'phosphor-react-native/src/icons/CaretRight';
import {StyleSheet, View} from 'react-native';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {PAYMENT_DOT_COLORS} from '@/src/constants/UI_COLORS';
import {ICON_SIZE, PAYMENT_DOT_SIZE, SPACING, TOUCH_TARGET} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {RecurringItem} from '@/src/types/importApi';
import {describeCadence} from '@/src/utils/format/describeCadence';
import {formatCalendarDate} from '@/src/utils/format/formatDate';
import {formatMoney} from '@/src/utils/format/formatMoney';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The texts never get narrower than this: on a narrow row the amount moves under them. */
const TEXTS_MIN_WIDTH = 140;
/** The dot styles in the order of PAYMENT_DOT_COLORS: coral, sky, mint, sand, rose. */
const DOT_STYLE_KEYS = ['dotCoral', 'dotSky', 'dotMint', 'dotSand', 'dotRose'] as const;

type PaymentRowProps = {
  payment: RecurringItem;
  currency: string;
  /** The place of the row in the list, from 0: it picks the dot color. */
  position: number;
  onPress: (paymentId: string) => void;
  testID: string;
};

/** One recurring payment: color dot with the merchant, cadence, last charge, amount, and "Details". */
export const PaymentRow = ({payment, currency, position, onPress, testID}: PaymentRowProps) => {
  const {styles, colors} = usePaymentRowStyles();
  const {t, language} = useTranslation();
  const amount = formatMoney(payment.amountMinor, currency, language);
  const cadence = describeCadence(payment.cadence, language);
  const lastCharge = t.importResult.lastCharge(formatCalendarDate(payment.lastSeen, language));
  const accessibilityLabel = t.importResult.paymentLabel(payment.merchant, amount, cadence);
  const dotStyle = styles[DOT_STYLE_KEYS[position % DOT_STYLE_KEYS.length]];
  const openDetails = () => onPress(payment.id);
  return (
    <View testID={testID} collapsable={false}>
      <TouchableScaleView
        onPress={openDetails}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t.importResult.details}
        style={styles.row}
      >
        <View style={styles.texts}>
          <View style={styles.merchantLine}>
            <View style={[styles.dot, dotStyle]} />
            <TextLine variant="label" style={styles.merchant}>
              {payment.merchant}
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
      minWidth: TEXTS_MIN_WIDTH,
      gap: SPACING.xxs
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
    dotCoral: {
      backgroundColor: PAYMENT_DOT_COLORS[0]
    },
    dotSky: {
      backgroundColor: PAYMENT_DOT_COLORS[1]
    },
    dotMint: {
      backgroundColor: PAYMENT_DOT_COLORS[2]
    },
    dotSand: {
      backgroundColor: PAYMENT_DOT_COLORS[3]
    },
    dotRose: {
      backgroundColor: PAYMENT_DOT_COLORS[4]
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
