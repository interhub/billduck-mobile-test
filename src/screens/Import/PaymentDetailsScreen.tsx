import {RouteProp, useRoute} from '@react-navigation/native';
import {StyleSheet, View} from 'react-native';
import {Card} from '@/src/components/ui/Card';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {describeCadence} from '@/src/components/ui/PaymentRow';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {RootStackParamList, SCREEN_NAME} from '@/src/navigation/types';
import {useImportStore} from '@/src/stores/importStore';
import {formatCalendarDate} from '@/src/utils/format/formatDate';
import {formatMoney} from '@/src/utils/format/formatMoney';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export const PaymentDetailsScreen = () => {
  const {styles} = usePaymentDetailsScreenStyles();
  const {t, language} = useTranslation();
  const navigation = useAppNavigation();
  const {params} = useRoute<RouteProp<RootStackParamList, SCREEN_NAME.PAYMENT_DETAILS>>();
  const payments = useImportStore((state) => state.payments);
  const paymentItem = payments?.items.find((candidate) => candidate.id === params.paymentId);
  const header = <ScreenHeader onBack={navigation.goBack} testID="payment_details_back_button" />;
  if (!payments || !paymentItem) {
    return (
      <ScreenLayout testID="payment_details_screen" header={header}>
        <TextLine variant="display" accessibilityRole="header">
          {t.paymentDetails.title}
        </TextLine>
        <TextLine>{t.paymentDetails.missing}</TextLine>
      </ScreenLayout>
    );
  }
  return (
    <ScreenLayout testID="payment_details_screen" header={header}>
      <View style={styles.heading}>
        <TextLine variant="caption">{t.paymentDetails.title}</TextLine>
        <TextLine variant="display" accessibilityRole="header">
          {paymentItem.merchant}
        </TextLine>
      </View>
      <Card>
        <InfoRow
          label={t.paymentDetails.amountLabel}
          value={formatMoney(paymentItem.amountMinor, payments.currency, language)}
          valueVariant="money"
          testID="payment_details_amount_text"
        />
        <InfoRow
          label={t.paymentDetails.cadenceLabel}
          value={describeCadence(paymentItem.cadence, t)}
        />
        <InfoRow
          label={t.paymentDetails.lastChargeLabel}
          value={formatCalendarDate(paymentItem.lastSeen, language)}
          valueVariant="money"
        />
        <InfoRow
          label={t.paymentDetails.currencyLabel}
          value={payments.currency}
          valueVariant="money"
        />
      </Card>
      <TextLine variant="caption">{t.paymentDetails.note}</TextLine>
    </ScreenLayout>
  );
};

const usePaymentDetailsScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    heading: {
      gap: SPACING.xs
    }
  })
);
