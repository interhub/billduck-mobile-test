import {ReactNode, useState} from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle
} from 'react-native';
import {MOTION} from '@/src/constants/UI_MOTION';
import {useReduceMotion} from '@/src/hooks/sensors/useReduceMotion';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type TouchableScaleViewProps = Omit<PressableProps, 'style' | 'children' | 'testID'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Goes on a plain wrapper: the identifier of a pressable never reaches UI tests on iOS. */
  testID?: string;
};

/** A pressable area that shrinks a little while pressed; no scale under Reduce Motion. */
export const TouchableScaleView = ({
  children,
  style,
  testID,
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
  const scaleStyle = {transform: [{scale}]};
  const pressable = (
    <Pressable {...pressableProps} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.content, style, scaleStyle]}>{children}</Animated.View>
    </Pressable>
  );
  if (testID === undefined) {
    return pressable;
  }
  return (
    <View testID={testID} collapsable={false}>
      {pressable}
    </View>
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
