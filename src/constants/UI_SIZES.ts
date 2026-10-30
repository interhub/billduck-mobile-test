import {Platform} from 'react-native';

/** The 4-point spacing grid, with one 2-point half step for tight text stacks. */
export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const RADIUS = {
  button: 10,
  card: 16,
  pill: 32
} as const;

/** The smallest tappable side: 44 pt on iOS, 48 dp on Android. */
export const TOUCH_TARGET = Platform.select({ios: 44, default: 48});

export const ICON_SIZE = {
  sm: 20,
  md: 24
} as const;

export const SCREEN_PADDING = 20;

export const BORDER_WIDTH = 1;

export const DISABLED_OPACITY = 0.45;

export const STATUS_DOT_SIZE = 10;

/** The empty ring of a waiting status is a little larger than the dot, with a thicker line. */
export const STATUS_RING_SIZE = 12;

export const STATUS_RING_BORDER_WIDTH = 2;

/** The badge padding sits between the grid steps: 6 pt above and below, 10 pt before the mark. */
export const STATUS_BADGE_PADDING = {
  vertical: 6,
  left: 10
} as const;

export const PAYMENT_DOT_SIZE = 12;

export const ILLUSTRATION = {
  maxWidth: 280,
  /** Width over height of the box every bd_* picture is fitted into. */
  aspectRatio: 1.5,
  /** Above this font scale, or on a window shorter than `shortWindowHeight`, the picture halves. */
  shrinkFontScale: 1.3,
  /** Above this font scale the picture is not shown at all. */
  hideFontScale: 1.6,
  shortWindowHeight: 700
} as const;

export const LOGO = {
  markSize: 40
} as const;
