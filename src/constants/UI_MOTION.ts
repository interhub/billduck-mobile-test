import {Easing} from 'react-native';

/** Calm brand motion: short transitions on one curve, or one spring. */
export const MOTION = {
  durationFast: 150,
  durationBase: 200,
  durationSlow: 250,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
  spring: {
    stiffness: 100,
    damping: 20,
    mass: 1
  },
  pressScale: 0.97,
  /** One cycle of the soft pulse of an active status dot. */
  pulseCycleMs: 1200,
  pulseMinOpacity: 0.35
} as const;
