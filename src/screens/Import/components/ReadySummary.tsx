import {Card} from '@/src/components/ui/Card';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {StatementPayments} from '@/src/stores/importStore';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';

type ReadySummaryProps = {
  payments: StatementPayments;
};

/** What the ready report holds, before it is opened. */
export const ReadySummary = ({payments}: ReadySummaryProps) => {
  const {t, language} = useTranslation();
  return (
    <Card>
      <TextLine variant="label">{t.home.repeatingPayments(payments.items.length)}</TextLine>
      <TextLine variant="money">
        {formatMonthlyTotal(payments.items, payments.currency, language)}
      </TextLine>
    </Card>
  );
};
