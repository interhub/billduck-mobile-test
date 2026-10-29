import {CaretRightIcon} from 'phosphor-react-native/src/icons/CaretRight';
import {StyleSheet, View} from 'react-native';
import {BORDER_WIDTH, ICON_SIZE, RADIUS, SPACING} from '@/src/constants/UI_SIZES';
import {StatusBadge} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {ImportSubject} from '@/src/hooks/import/useImportSubject';
import {useTranslation} from '@/src/i18n/useTranslation';
import {StatementPayments} from '@/src/stores/importStore';
import {formatMonthlyTotal} from '@/src/utils/format/formatMoney';
import {formatStatementTitle} from '@/src/utils/format/formatStatementTitle';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type CurrentImportCardProps = {
  subject: ImportSubject;
  payments: StatementPayments | null;
  onPress: () => void;
};

/** The statement in the works: its generated title, its status and, when ready, the monthly total. */
export const CurrentImportCard = ({subject, payments, onPress}: CurrentImportCardProps) => {
  const {styles, colors} = useCurrentImportCardStyles();
  const {t, language} = useTranslation();
  if (!subject.phase || !subject.titleSource) {
    return null;
  }
  const title = formatStatementTitle(subject.titleSource, language);
  const summary =
    payments && subject.phase === 'ready' ? (
      <TextLine variant="money">
        {`${t.home.repeatingPayments(payments.items.length)} · ${formatMonthlyTotal(payments.items, payments.currency, language)}`}
      </TextLine>
    ) : null;
  return (
    <View testID="home_current_import_row" collapsable={false}>
      <TouchableScaleView
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${t.home.currentStatement}. ${title}. ${t.phase[subject.phase]}`}
        style={styles.card}
      >
        <View style={styles.texts}>
          <TextLine variant="caption">{t.home.currentStatement}</TextLine>
          <TextLine variant="label">{title}</TextLine>
          <StatusBadge phase={subject.phase} />
          {summary}
        </View>
        <CaretRightIcon size={ICON_SIZE.sm} color={colors.textMuted} weight="regular" />
      </TouchableScaleView>
    </View>
  );
};

const useCurrentImportCardStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    card: {
      gap: SPACING.md,
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      borderWidth: BORDER_WIDTH,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    texts: {
      flex: 1,
      gap: SPACING.sm
    }
  })
);
