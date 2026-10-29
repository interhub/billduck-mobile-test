import {useEffect, useState} from 'react';
import {Animated, StyleSheet} from 'react-native';
import {MOTION} from '@/src/constants/UI_MOTION';
import {SPACING} from '@/src/constants/UI_SIZES';
import {Illustration} from '@/src/components/ui/Illustration';
import {StatusBadge} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {useReduceMotion} from '@/src/hooks/sensors/useReduceMotion';
import {StatusDescription} from '@/src/screens/Import/logic/describeImportStatus';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type StatusHeroProps = {
  description: StatusDescription;
  title: string | null;
  detail: string | null;
};

/** The large honest status. A new phase cross-fades in; under Reduce Motion it simply appears. */
export const StatusHero = ({description, title, detail}: StatusHeroProps) => {
  const {styles} = useStatusHeroStyles();
  const isReduceMotionEnabled = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (isReduceMotionEnabled) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0.4);
    Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.durationSlow,
      easing: MOTION.easing,
      useNativeDriver: true
    }).start();
  }, [description.badgePhase, isReduceMotionEnabled, opacity]);
  const titleLine = title ? <TextLine variant="caption">{title}</TextLine> : null;
  const detailLine = detail ? (
    <TextLine variant="money" color="textMuted">
      {detail}
    </TextLine>
  ) : null;
  return (
    <Animated.View style={[styles.hero, {opacity}]}>
      <Illustration name={description.illustration} />
      {titleLine}
      <StatusBadge phase={description.badgePhase} testID="import_status_phase_badge" />
      <TextLine variant="title" testID="import_status_explanation_text">
        {description.explanation}
      </TextLine>
      {detailLine}
    </Animated.View>
  );
};

const useStatusHeroStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    hero: {
      gap: SPACING.md
    }
  })
);
