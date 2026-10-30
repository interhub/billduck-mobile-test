import {ArrowsClockwiseIcon} from 'phosphor-react-native/src/icons/ArrowsClockwise';
import {ArrowsLeftRightIcon} from 'phosphor-react-native/src/icons/ArrowsLeftRight';
import {CheckIcon} from 'phosphor-react-native/src/icons/Check';
import {CheckCircleIcon} from 'phosphor-react-native/src/icons/CheckCircle';
import {CloudSlashIcon} from 'phosphor-react-native/src/icons/CloudSlash';
import {QuestionIcon} from 'phosphor-react-native/src/icons/Question';
import {TrashIcon} from 'phosphor-react-native/src/icons/Trash';
import {WarningCircleIcon} from 'phosphor-react-native/src/icons/WarningCircle';
import {WarningOctagonIcon} from 'phosphor-react-native/src/icons/WarningOctagon';
import {XCircleIcon} from 'phosphor-react-native/src/icons/XCircle';
import type {Icon} from 'phosphor-react-native';
import {useEffect, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {MOTION} from '@/src/constants/UI_MOTION';
import {BORDER_WIDTH, ICON_SIZE, SPACING, STATUS_DOT_SIZE} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {useReduceMotion} from '@/src/hooks/sensors/useReduceMotion';
import {useTranslation} from '@/src/i18n/useTranslation';
import {ImportPhase} from '@/src/types/importOperation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export type BadgePhase = Exclude<ImportPhase, 'validating' | 'rejected' | 'confirming'>;

const PRE_SEND_PHASES: readonly ImportPhase[] = ['validating', 'rejected', 'confirming'];

const isBadgePhase = (phase: ImportPhase): phase is BadgePhase => !PRE_SEND_PHASES.includes(phase);

/** The pre-send phases have no badge. */
export const toBadgePhase = (phase: ImportPhase): BadgePhase | null => {
  if (isBadgePhase(phase)) {
    return phase;
  }
  return null;
};

type BadgeLook = {
  color: keyof ThemeColors;
  /** A pulsing dot for work in progress, an empty ring for waiting, or an icon. */
  mark: 'pulse' | 'ring' | Icon;
};

const BADGE_LOOK: Record<BadgePhase, BadgeLook> = {
  uploading: {color: 'textPrimary', mark: 'pulse'},
  queued: {color: 'textMuted', mark: 'ring'},
  processing: {color: 'textPrimary', mark: 'pulse'},
  ready: {color: 'success', mark: CheckCircleIcon},
  reconnecting: {color: 'accentText', mark: ArrowsClockwiseIcon},
  not_received: {color: 'accentText', mark: WarningCircleIcon},
  server_unavailable: {color: 'error', mark: CloudSlashIcon},
  failed: {color: 'error', mark: WarningOctagonIcon},
  replacing_previous: {color: 'textMuted', mark: ArrowsLeftRightIcon},
  deleting: {color: 'textMuted', mark: TrashIcon},
  delete_failed: {color: 'error', mark: XCircleIcon},
  deleted: {color: 'textMuted', mark: CheckIcon},
  gone_on_server: {color: 'textMuted', mark: QuestionIcon}
};

/** The soft pulse of a status at work; a still dot under Reduce Motion. */
const PulseDot = () => {
  const {styles} = useStatusBadgeStyles();
  const isReduceMotionEnabled = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (isReduceMotionEnabled) {
      opacity.setValue(1);
      return;
    }
    const halfCycle = MOTION.pulseCycleMs / 2;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: MOTION.pulseMinOpacity,
          duration: halfCycle,
          easing: MOTION.pulseEasing,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: halfCycle,
          easing: MOTION.pulseEasing,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [isReduceMotionEnabled, opacity]);
  return <Animated.View style={[styles.dot, {opacity}]} />;
};

const BadgeMark = ({look}: {look: BadgeLook}) => {
  const {styles, colors} = useStatusBadgeStyles();
  if (look.mark === 'pulse') {
    return <PulseDot />;
  }
  if (look.mark === 'ring') {
    return <View style={styles.ring} />;
  }
  const MarkIcon = look.mark;
  return <MarkIcon size={ICON_SIZE.sm} color={colors[look.color]} weight="regular" />;
};

type StatusBadgeProps = {
  phase: BadgePhase;
  testID?: string;
};

/** The phase as an icon and a word in its brand color: never color alone. */
export const StatusBadge = ({phase, testID}: StatusBadgeProps) => {
  const {styles} = useStatusBadgeStyles();
  const {t} = useTranslation();
  const look = BADGE_LOOK[phase];
  const word = t.phase[phase];
  return (
    <View testID={testID} collapsable={false}>
      <View style={styles.badge} accessible accessibilityRole="text" accessibilityLabel={word}>
        <View style={styles.markBox} importantForAccessibility="no-hide-descendants">
          <BadgeMark look={look} />
        </View>
        <TextLine variant="label" color={look.color}>
          {word}
        </TextLine>
      </View>
    </View>
  );
};

const useStatusBadgeStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      paddingVertical: SPACING.xs + 2,
      paddingLeft: SPACING.md - 2,
      paddingRight: SPACING.md,
      borderRadius: SPACING.xxl,
      backgroundColor: colors.surfaceSecondary
    },
    markBox: {
      width: ICON_SIZE.sm,
      height: ICON_SIZE.sm,
      alignItems: 'center',
      justifyContent: 'center'
    },
    dot: {
      width: STATUS_DOT_SIZE,
      height: STATUS_DOT_SIZE,
      borderRadius: STATUS_DOT_SIZE / 2,
      backgroundColor: colors.accent
    },
    ring: {
      width: STATUS_DOT_SIZE + 2,
      height: STATUS_DOT_SIZE + 2,
      borderRadius: (STATUS_DOT_SIZE + 2) / 2,
      borderWidth: BORDER_WIDTH + 1,
      borderColor: colors.textMuted
    }
  })
);
