import {CheckIcon} from 'phosphor-react-native/src/icons/Check';
import {InfoIcon} from 'phosphor-react-native/src/icons/Info';
import type {Icon} from 'phosphor-react-native';
import {StyleSheet, View} from 'react-native';
import {ICON_SIZE, SPACING} from '@/src/constants/UI_SIZES';
import {MainButton} from '@/src/components/ui/MainButton';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {ImportOutcome} from '@/src/stores/importStore';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type NoticeLineProps = {
  icon: Icon;
  text: string;
  testID: string;
};

const NoticeLine = ({icon: NoticeIcon, text, testID}: NoticeLineProps) => {
  const {styles, colors} = useHomeNoticesStyles();
  return (
    <View style={styles.line} testID={testID}>
      <NoticeIcon size={ICON_SIZE.sm} color={colors.textMuted} weight="regular" />
      <TextLine variant="body" style={styles.text}>
        {text}
      </TextLine>
    </View>
  );
};

type HomeNoticesProps = {
  hasPendingCleanups: boolean;
  outcome: ImportOutcome | null;
  onCheckServer: () => void;
};

/** Honest lines about what happened last: a cleanup still to do, a confirmed deletion, a lost job. */
export const HomeNotices = ({hasPendingCleanups, outcome, onCheckServer}: HomeNoticesProps) => {
  const {styles} = useHomeNoticesStyles();
  const {t} = useTranslation();
  const lines = [];
  if (hasPendingCleanups) {
    lines.push(
      <NoticeLine
        key="cleanup"
        icon={InfoIcon}
        text={t.home.cleanupPending}
        testID="home_cleanup_text"
      />
    );
    lines.push(
      <MainButton
        key="check"
        title={t.common.retry}
        variant="secondary"
        onPress={onCheckServer}
        testID="home_check_server_button"
      />
    );
  }
  if (outcome?.kind === 'deleted') {
    lines.push(
      <NoticeLine
        key="deleted"
        icon={CheckIcon}
        text={t.home.outcomeDeleted}
        testID="home_outcome_text"
      />
    );
  }
  if (outcome?.kind === 'gone_on_server') {
    lines.push(
      <NoticeLine key="gone" icon={InfoIcon} text={t.home.outcomeGone} testID="home_outcome_text" />
    );
  }
  if (outcome?.kind === 'upload_cancelled' && !hasPendingCleanups) {
    lines.push(
      <NoticeLine
        key="cancelled"
        icon={InfoIcon}
        text={t.home.outcomeCancelled}
        testID="home_outcome_text"
      />
    );
  }
  if (lines.length === 0) {
    return null;
  }
  return <View style={styles.notices}>{lines}</View>;
};

const useHomeNoticesStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    notices: {
      gap: SPACING.md
    },
    line: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm
    },
    text: {
      flex: 1
    }
  })
);
