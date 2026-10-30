import {StyleSheet, View} from 'react-native';
import {ResponseTimeline} from '@/src/components/ui/ResponseTimeline';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useImportStore} from '@/src/stores/importStore';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** The server answers of the current import, under its status. */
export const StatusTimeline = () => {
  const {styles} = useStatusTimelineStyles();
  const {t} = useTranslation();
  const timeline = useImportStore((state) => state.timeline);
  return (
    <View style={styles.timeline}>
      <TextLine variant="label">{t.importStatus.timelineTitle}</TextLine>
      <ResponseTimeline
        entries={timeline}
        emptyText={t.importStatus.timelineEmpty}
        testID="import_status_timeline_list"
      />
    </View>
  );
};

const useStatusTimelineStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    timeline: {
      gap: SPACING.md
    }
  })
);
