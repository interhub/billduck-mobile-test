import {CheckIcon} from 'phosphor-react-native/src/icons/Check';
import {InfoIcon} from 'phosphor-react-native/src/icons/Info';
import type {Icon} from 'phosphor-react-native';
import {StyleSheet, View} from 'react-native';
import {ICON_SIZE, SPACING} from '@/src/constants/UI_SIZES';
import {MainButton} from '@/src/components/ui/MainButton';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {resolveOutcomeNotice} from '@/src/screens/Home/logic/resolveOutcomeNotice';
import {ImportOutcome, ImportOutcomeKind} from '@/src/types/importDraft';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

const OUTCOME_ICON: Record<ImportOutcomeKind, Icon> = {
  deleted: CheckIcon,
  gone_on_server: InfoIcon,
  upload_cancelled: InfoIcon
};

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

type CleanupNoticeProps = {
  isVisible: boolean;
  onRetry: () => void;
};

/** A cancelled upload still to be checked on the server, and a way to check it now. */
const CleanupNotice = ({isVisible, onRetry}: CleanupNoticeProps) => {
  const {t} = useTranslation();
  if (!isVisible) {
    return null;
  }
  return (
    <>
      <NoticeLine icon={InfoIcon} text={t.home.cleanupPending} testID="home_cleanup_text" />
      <MainButton
        title={t.common.retry}
        variant="secondary"
        onPress={onRetry}
        testID="home_check_server_button"
      />
    </>
  );
};

type OutcomeNoticeProps = {
  outcomeKind: ImportOutcomeKind | null;
};

const OutcomeNotice = ({outcomeKind}: OutcomeNoticeProps) => {
  const {t} = useTranslation();
  if (!outcomeKind) {
    return null;
  }
  return (
    <NoticeLine
      icon={OUTCOME_ICON[outcomeKind]}
      text={t.home.outcome[outcomeKind]}
      testID="home_outcome_text"
    />
  );
};

type HomeNoticesProps = {
  hasPendingCleanups: boolean;
  outcome: ImportOutcome | null;
  onRetryCleanups: () => void;
};

/** Honest lines about what happened last: a cleanup still to do, a confirmed deletion, a lost job. */
export const HomeNotices = ({hasPendingCleanups, outcome, onRetryCleanups}: HomeNoticesProps) => {
  const {styles} = useHomeNoticesStyles();
  const outcomeKind = resolveOutcomeNotice(outcome, hasPendingCleanups);
  if (!hasPendingCleanups && !outcomeKind) {
    return null;
  }
  return (
    <View style={styles.notices}>
      <CleanupNotice isVisible={hasPendingCleanups} onRetry={onRetryCleanups} />
      <OutcomeNotice outcomeKind={outcomeKind} />
    </View>
  );
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
