import {StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {MainButton} from '@/src/components/ui/MainButton';
import {OptionalText} from '@/src/components/ui/OptionalText';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useImportStore} from '@/src/stores/importStore';
import {formatLocalTime} from '@/src/utils/format/formatDate';
import {hasSkippedStaleAnswer} from '@/src/utils/import/importTimeline';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type CheckedAtLineProps = {
  lastAnswerAt: string | null;
};

const CheckedAtLine = ({lastAnswerAt}: CheckedAtLineProps) => {
  const {t} = useTranslation();
  if (!lastAnswerAt) {
    return null;
  }
  const checkedAtText = t.importResult.checkedAt(formatLocalTime(lastAnswerAt));
  return <TextLine variant="caption">{checkedAtText}</TextLine>;
};

type ResultMetaProps = {
  operationId: string;
  onOpenStatus: () => void;
};

/** How fresh the report is: a skipped older answer, the last check, the way to all answers. */
export const ResultMeta = ({operationId, onOpenStatus}: ResultMetaProps) => {
  const {styles} = useResultMetaStyles();
  const {t} = useTranslation();
  const {timeline, lastAnswerAt} = useImportStore(
    useShallow((state) => ({timeline: state.timeline, lastAnswerAt: state.lastAnswerAt}))
  );
  const isStaleSkipped = hasSkippedStaleAnswer(timeline, operationId);
  return (
    <>
      <OptionalText
        isVisible={isStaleSkipped}
        text={t.importResult.staleSkipped}
        variant="caption"
        testID="import_result_stale_text"
      />
      <View style={styles.meta}>
        <CheckedAtLine lastAnswerAt={lastAnswerAt} />
        <MainButton
          title={t.importResult.serverAnswers}
          variant="secondary"
          onPress={onOpenStatus}
          testID="import_result_status_link"
        />
      </View>
    </>
  );
};

const useResultMetaStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    meta: {
      gap: SPACING.md
    }
  })
);
