import {ReactNode} from 'react';
import {AccessibilityRole, StyleProp, StyleSheet, Text, TextStyle} from 'react-native';
import {FONT_NAME} from '@/src/constants/FONT_NAME';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export type TextLineVariant =
  'display' | 'title' | 'label' | 'body' | 'caption' | 'money' | 'moneyLarge';

type TextLineProps = {
  children: ReactNode;
  variant?: TextLineVariant;
  /** A palette key; captions default to `textMuted`, everything else to `textPrimary`. */
  color?: keyof ThemeColors;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

const resolveDefaultColor = (variant: TextLineVariant): keyof ThemeColors => {
  if (variant === 'caption') {
    return 'textMuted';
  }
  return 'textPrimary';
};

/** The only way to render text: brand families, sizes and colors live in its variants. */
export const TextLine = ({
  children,
  variant = 'body',
  color,
  align,
  numberOfLines,
  accessibilityRole,
  accessibilityLabel,
  style,
  testID
}: TextLineProps) => {
  const {styles, colors} = useTextLineStyles();
  const textColor = colors[color ?? resolveDefaultColor(variant)];
  return (
    <Text
      style={[styles[variant], {color: textColor, textAlign: align}, style]}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </Text>
  );
};

const useTextLineStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    display: {
      fontFamily: FONT_NAME.UNBOUNDED_SEMIBOLD,
      fontSize: 26,
      lineHeight: 32
    },
    title: {
      fontFamily: FONT_NAME.GEIST_MEDIUM,
      fontSize: 22,
      lineHeight: 28
    },
    label: {
      fontFamily: FONT_NAME.GEIST_MEDIUM,
      fontSize: 16,
      lineHeight: 22
    },
    body: {
      fontFamily: FONT_NAME.GEIST_REGULAR,
      fontSize: 16,
      lineHeight: 23
    },
    caption: {
      fontFamily: FONT_NAME.GEIST_REGULAR,
      fontSize: 13,
      lineHeight: 18
    },
    money: {
      fontFamily: FONT_NAME.GEIST_MONO_REGULAR,
      fontSize: 15,
      lineHeight: 21
    },
    moneyLarge: {
      fontFamily: FONT_NAME.GEIST_MONO_MEDIUM,
      fontSize: 30,
      lineHeight: 36
    }
  })
);
