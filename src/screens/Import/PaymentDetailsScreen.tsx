import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';

export const PaymentDetailsScreen = () => {
  const {t} = useTranslation();
  const navigation = useAppNavigation();
  const header = <ScreenHeader onBack={navigation.goBack} testID="payment_details_back_button" />;
  return (
    <ScreenLayout testID="payment_details_screen" header={header}>
      <TextLine variant="display" accessibilityRole="header">
        {t.paymentDetails.title}
      </TextLine>
      <TextLine>{t.paymentDetails.note}</TextLine>
    </ScreenLayout>
  );
};
