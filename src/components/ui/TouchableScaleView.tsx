import {ReactNode, useState} from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle
} from 'react-native';
import {MOTION} from '@/src/constants/UI_MOTION';
import {useReduceMotion} from '@/src/hooks/sensors/useReduceMotion';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type TouchableScaleViewProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** A pressable area that shrinks a little while pressed; no scale under Reduce Motion. */
export const TouchableScaleView = ({
  children,
  style,
  onPressIn,
  onPressOut,
  ...pressableProps
}: TouchableScaleViewProps) => {
  const {styles} = useTouchableScaleViewStyles();
  const isReduceMotionEnabled = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const animateTo = (toValue: number) => {
    if (isReduceMotionEnabled) {
      scale.setValue(1);
      return;
    }
    Animated.timing(scale, {
      toValue,
      duration: MOTION.durationFast,
      easing: MOTION.easing,
      useNativeDriver: true
    }).start();
  };
  const handlePressIn = (event: GestureResponderEvent) => {
    animateTo(MOTION.pressScale);
    onPressIn?.(event);
  };
  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1);
    onPressOut?.(event);
  };
  return (
    <Pressable {...pressableProps} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.content, style, {transform: [{scale}]}]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const useTouchableScaleViewStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    content: {
      flexDirection: 'row',
      alignItems: 'center'
    }
  })
);
