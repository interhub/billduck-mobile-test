import {Platform} from 'react-native';

/** The 4-point spacing grid. */
export const SPACING = {
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
  sheet: 24
} as const;

/** The smallest tappable side: 44 pt on iOS, 48 dp on Android. */
export const TOUCH_TARGET = Platform.select({ios: 44, default: 48});

export const ICON_SIZE = {
  sm: 20,
  md: 24
} as const;

export const SCREEN_PADDING = 20;

export const BORDER_WIDTH = 1;

/** Size of a status dot or ring inside a badge. */
export const STATUS_DOT_SIZE = 10;

/** Size of the payment color dot in a row. */
export const PAYMENT_DOT_SIZE = 12;

export const ILLUSTRATION = {
  maxWidth: 280,
  /** Width over height of the box every bd_* picture is fitted into. */
  aspectRatio: 1.5,
  /** Above this font scale, or on a window shorter than SHORT_WINDOW_HEIGHT, the picture halves. */
  shrinkFontScale: 1.3,
  /** Above this font scale the picture is not shown at all. */
  hideFontScale: 1.6,
  shortWindowHeight: 700
} as const;

export const LOGO = {
  markSize: 40,
  smallMarkSize: 24
} as const;
