import {CaretRightIcon} from 'phosphor-react-native/src/icons/CaretRight';
import {StyleSheet, View} from 'react-native';
import {Card} from '@/src/components/ui/Card';
import {MonthlyTotal} from '@/src/components/ui/MonthlyTotal';
import {StatusBadge} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {ICON_SIZE, SPACING} from '@/src/constants/UI_SIZES';
import {useImportSubject} from '@/src/hooks/import/useImportSubject';
import {useTranslation} from '@/src/i18n/useTranslation';
import {resolveCurrentImportTarget} from '@/src/screens/Home/logic/resolveCurrentImportTarget';
import {useImportStore} from '@/src/stores/importStore';
import {StatementPayments} from '@/src/types/importDraft';
import {formatStatementTitle} from '@/src/utils/format/formatStatementTitle';
import {BadgePhase} from '@/src/utils/import/importPhases';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ReadyTotalProps = {
  phase: BadgePhase;
  payments: StatementPayments | null;
};

/** The monthly total and the count of repeating payments, once the statement is ready. */
const ReadyTotal = ({phase, payments}: ReadyTotalProps) => {
  if (!payments || phase !== 'ready') {
    return null;
  }
  return <MonthlyTotal payments={payments} variant="money" />;
};

type CurrentImportCardProps = {
  onPress: () => void;
};

/** The statement in the works: its generated title, its status and, when ready, the monthly total. */
export const CurrentImportCard = ({onPress}: CurrentImportCardProps) => {
  const {styles, colors} = useCurrentImportCardStyles();
  const {t, language} = useTranslation();
  const subject = useImportSubject();
  const payments = useImportStore((state) => state.payments);
  if (!subject.phase || !subject.titleSource) {
    return null;
  }
  const title = formatStatementTitle(subject.titleSource, language);
  const accessibilityLabel = t.home.currentImportLabel(title, t.phase[subject.phase]);
  const accessibilityHint = t.home.openHint[resolveCurrentImportTarget(subject.phase)];
  return (
    <View testID="home_current_import_row" collapsable={false}>
      <TouchableScaleView
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Card style={styles.card}>
          <View style={styles.texts}>
            <TextLine variant="caption">{t.home.currentStatement}</TextLine>
            <TextLine variant="label">{title}</TextLine>
            <StatusBadge phase={subject.phase} />
            <ReadyTotal phase={subject.phase} payments={payments} />
          </View>
          <CaretRightIcon size={ICON_SIZE.sm} color={colors.textMuted} weight="regular" />
        </Card>
      </TouchableScaleView>
    </View>
  );
};

const useCurrentImportCardStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    card: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center'
    },
    texts: {
      flex: 1,
      gap: SPACING.sm
    }
  })
);
