import {useEffect, useState} from 'react';
import {Animated, StyleSheet} from 'react-native';
import {MOTION} from '@/src/constants/UI_MOTION';
import {SPACING} from '@/src/constants/UI_SIZES';
import {Illustration} from '@/src/components/ui/Illustration';
import {OptionalText} from '@/src/components/ui/OptionalText';
import {StatusBadge} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {useReduceMotion} from '@/src/hooks/sensors/useReduceMotion';
import {StatusDescription} from '@/src/screens/Import/logic/describeImportStatus';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/** A new phase starts dimmed and fades in to full opacity. */
const PHASE_ENTER_OPACITY = 0.4;

type StatusHeroProps = {
  description: StatusDescription;
  title: string | null;
  detail: string | null;
};

/** The large honest status. A new phase fades in; under Reduce Motion it simply appears. */
export const StatusHero = ({description, title, detail}: StatusHeroProps) => {
  const {styles} = useStatusHeroStyles();
  const isReduceMotionEnabled = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (isReduceMotionEnabled) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(PHASE_ENTER_OPACITY);
    const fadeIn = Animated.timing(opacity, {
      toValue: 1,
      duration: MOTION.durationSlow,
      easing: MOTION.easing,
      useNativeDriver: true
    });
    fadeIn.start();
    return () => {
      fadeIn.stop();
    };
  }, [description.badgePhase, isReduceMotionEnabled, opacity]);
  const fadeStyle = {opacity};
  return (
    <Animated.View style={[styles.hero, fadeStyle]}>
      <Illustration name={description.illustration} />
      <OptionalText text={title} variant="caption" />
      <StatusBadge phase={description.badgePhase} testID="import_status_phase_badge" />
      <TextLine variant="title" testID="import_status_explanation_text">
        {description.explanation}
      </TextLine>
      <OptionalText text={detail} variant="money" color="textMuted" />
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
