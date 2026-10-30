import {StyleSheet} from 'react-native';
import {Card} from '@/src/components/ui/Card';
import {MonthlyTotal} from '@/src/components/ui/MonthlyTotal';
import {SPACING} from '@/src/constants/UI_SIZES';
import {StatementPayments} from '@/src/types/importDraft';
import {BadgePhase} from '@/src/utils/import/importPhases';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ReadySummaryProps = {
  phase: BadgePhase;
  payments: StatementPayments | null;
};

/** What the ready report holds, before it is opened: the monthly total, then the count. */
export const ReadySummary = ({phase, payments}: ReadySummaryProps) => {
  const {styles} = useReadySummaryStyles();
  if (phase !== 'ready' || !payments) {
    return null;
  }
  return (
    <Card>
      <MonthlyTotal payments={payments} variant="money" style={styles.total} />
    </Card>
  );
};

const useReadySummaryStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    total: {
      gap: SPACING.md
    }
  })
);
