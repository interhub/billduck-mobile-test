import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {BORDER_WIDTH, SPACING, STATUS_DOT_SIZE} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {Translation} from '@/src/i18n/translationsEn';
import {useTranslation} from '@/src/i18n/useTranslation';
import {formatLocalTime} from '@/src/utils/format/formatDate';
import {TIMELINE_EVENT, TimelineEntry} from '@/src/utils/import/importTimeline';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** Each tone is a dot style of its own in the style hook. */
type Tone = 'neutral' | 'positive' | 'warning' | 'negative';

const EVENT_TONE: Record<TIMELINE_EVENT, Tone> = {
  [TIMELINE_EVENT.UPLOAD_SENT]: 'neutral',
  [TIMELINE_EVENT.UPLOAD_ACCEPTED]: 'positive',
  [TIMELINE_EVENT.UPLOAD_ANSWER_LOST]: 'warning',
  [TIMELINE_EVENT.UPLOAD_REJECTED]: 'negative',
  [TIMELINE_EVENT.APP_RESTARTED]: 'neutral',
  [TIMELINE_EVENT.KEY_LOOKUP_FOUND]: 'positive',
  [TIMELINE_EVENT.KEY_LOOKUP_NOT_FOUND]: 'neutral',
  [TIMELINE_EVENT.RESENT_SAME_KEY]: 'neutral',
  [TIMELINE_EVENT.FILE_MISSING]: 'negative',
  [TIMELINE_EVENT.STATUS_APPLIED]: 'positive',
  [TIMELINE_EVENT.STATUS_UNCHANGED]: 'neutral',
  [TIMELINE_EVENT.STATUS_STALE_SKIPPED]: 'warning',
  [TIMELINE_EVENT.STATUS_REJECTED]: 'negative',
  [TIMELINE_EVENT.NO_ANSWER]: 'warning',
  [TIMELINE_EVENT.RECONNECTING]: 'warning',
  [TIMELINE_EVENT.SERVER_UNAVAILABLE]: 'negative',
  [TIMELINE_EVENT.DELETE_SENT]: 'neutral',
  [TIMELINE_EVENT.DELETE_ACCEPTED]: 'neutral',
  [TIMELINE_EVENT.DELETE_FAILED]: 'negative',
  [TIMELINE_EVENT.DELETED]: 'positive',
  [TIMELINE_EVENT.GONE_ON_SERVER]: 'negative',
  [TIMELINE_EVENT.UPLOAD_CANCELLED]: 'neutral',
  [TIMELINE_EVENT.CLEANUP_DELETED]: 'positive',
  [TIMELINE_EVENT.CLEANUP_NOT_FOUND]: 'neutral',
  [TIMELINE_EVENT.LATE_ANSWER_DROPPED]: 'neutral'
};

/** "Previous statement · Status" for the deletion that runs before a replacement. */
const describeEvent = (entry: TimelineEntry, translations: Translation): string => {
  const eventText = translations.timeline.event[entry.event];
  if (entry.aboutPrevious) {
    return `${translations.timeline.previousStatement} · ${eventText}`;
  }
  return eventText;
};

/** "14:32:07 · Processing · r2 · HTTP 503 · attempt 2 · ×3": only what the server said, never file data. */
const describeDetails = (entry: TimelineEntry, translations: Translation): string => {
  const parts = [formatLocalTime(entry.at)];
  if (entry.status) {
    parts.push(translations.phase[entry.status]);
  }
  if (entry.revision !== null) {
    parts.push(translations.timeline.revision(entry.revision));
  }
  if (entry.httpStatus !== null) {
    parts.push(translations.timeline.httpStatus(entry.httpStatus));
  }
  if (entry.attempt !== null) {
    parts.push(translations.timeline.attempt(entry.attempt));
  }
  if (entry.repeats > 1) {
    parts.push(translations.timeline.repeats(entry.repeats));
  }
  return parts.join(' · ');
};

const SENTENCE_END = /[.!?…]$/;

/** The screen reader hears the event and its details as two sentences, without a doubled stop. */
const describeForScreenReader = (eventText: string, details: string): string => {
  if (SENTENCE_END.test(eventText)) {
    return `${eventText} ${details}`;
  }
  return `${eventText}. ${details}`;
};

type TimelineRailProps = {
  isLast: boolean;
};

/** The line from a row's dot down to the next row; the last row has none. */
const TimelineRail = ({isLast}: TimelineRailProps) => {
  const {styles} = useResponseTimelineStyles();
  if (isLast) {
    return null;
  }
  return <View style={styles.rail} />;
};

type TimelineRowProps = {
  entry: TimelineEntry;
  isLast: boolean;
};

const TimelineRow = ({entry, isLast}: TimelineRowProps) => {
  const {styles} = useResponseTimelineStyles();
  const {t} = useTranslation();
  const toneStyle = styles[EVENT_TONE[entry.event]];
  const eventText = describeEvent(entry, t);
  const details = describeDetails(entry, t);
  const accessibilityLabel = describeForScreenReader(eventText, details);
  return (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.marker}>
        <View style={[styles.dot, toneStyle]} />
        <TimelineRail isLast={isLast} />
      </View>
      <View style={styles.texts}>
        <TextLine variant="label">{eventText}</TextLine>
        <TextLine variant="money" color="textMuted">
          {details}
        </TextLine>
      </View>
    </View>
  );
};

type TimelineRowsProps = {
  entries: TimelineEntry[];
  emptyText: string;
};

/** The rows newest first, or the caption while there is nothing to show yet. */
const TimelineRows = ({entries, emptyText}: TimelineRowsProps) => {
  if (entries.length === 0) {
    return <TextLine variant="caption">{emptyText}</TextLine>;
  }
  const newestFirst = [...entries].reverse();
  const lastIndex = newestFirst.length - 1;
  const rows = newestFirst.map((entry, index) => {
    const isLast = index === lastIndex;
    return <TimelineRow key={entry.id} entry={entry} isLast={isLast} />;
  });
  return <>{rows}</>;
};

type ResponseTimelineProps = {
  entries: TimelineEntry[];
  emptyText: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Every server answer and every failed attempt, newest first; nothing is hidden or merged away. */
export const ResponseTimeline = ({entries, emptyText, style, testID}: ResponseTimelineProps) => (
  <View testID={testID} collapsable={false} style={style}>
    <TimelineRows entries={entries} emptyText={emptyText} />
  </View>
);

const useResponseTimelineStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: SPACING.md
    },
    marker: {
      width: STATUS_DOT_SIZE,
      alignItems: 'center',
      gap: SPACING.xs,
      paddingTop: SPACING.sm
    },
    dot: {
      width: STATUS_DOT_SIZE,
      height: STATUS_DOT_SIZE,
      borderRadius: STATUS_DOT_SIZE / 2
    },
    neutral: {
      backgroundColor: colors.textMuted
    },
    positive: {
      backgroundColor: colors.success
    },
    warning: {
      backgroundColor: colors.accentText
    },
    negative: {
      backgroundColor: colors.error
    },
    rail: {
      flex: 1,
      width: BORDER_WIDTH,
      backgroundColor: colors.border
    },
    texts: {
      flex: 1,
      gap: SPACING.xxs,
      paddingBottom: SPACING.lg
    }
  })
);
