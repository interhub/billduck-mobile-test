import {StyleProp, View, ViewStyle} from 'react-native';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {StatementPayments} from '@/src/types/importDraft';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';

type MonthlyTotalProps = {
  payments: StatementPayments;
  /** `moneyLarge` on the report itself, `money` where the total sums the report up. */
  variant: 'money' | 'moneyLarge';
  /** The gap between the two lines comes from the place that shows them. */
  style?: StyleProp<ViewStyle>;
  /** Marks the amount line: the value a test reads. */
  testID?: string;
};

/** The monthly total of the repeating payments in figures, then how many payments make it up. */
export const MonthlyTotal = ({payments, variant, style, testID}: MonthlyTotalProps) => {
  const {t, language} = useTranslation();
  const totalText = formatMonthlyTotal(payments.items, payments.currency, language);
  const countText = t.common.repeatingPayments(payments.items.length);
  return (
    <View style={style}>
      <TextLine variant={variant} testID={testID}>
        {totalText}
      </TextLine>
      <TextLine variant="caption">{countText}</TextLine>
    </View>
  );
};
