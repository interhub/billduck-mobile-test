import {useEffect, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

/** True while the system setting "Reduce Motion" is on: animations then show their end state. */
export const useReduceMotion = (): boolean => {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  useEffect(() => {
    const isMounted = {current: true};
    const readSetting = async () => {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      if (isMounted.current) {
        setIsReduceMotionEnabled(isEnabled);
      }
    };
    void readSetting();
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );
    return () => {
      isMounted.current = false;
      subscription.remove();
    };
  }, []);
  return isReduceMotionEnabled;
};
