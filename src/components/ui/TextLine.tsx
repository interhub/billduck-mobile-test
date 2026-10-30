import {ReactNode, useState} from 'react';
import {
  AccessibilityRole,
  StyleProp,
  StyleSheet,
  Text,
  TextLayoutEvent,
  TextStyle
} from 'react-native';
import {FONT_NAME} from '@/src/constants/FONT_NAME';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export type TextLineVariant =
  'display' | 'title' | 'label' | 'body' | 'caption' | 'money' | 'moneyLarge';

type TextAlign = NonNullable<TextStyle['textAlign']>;

type TextLineProps = {
  children: ReactNode;
  variant?: TextLineVariant;
  /** A palette key; captions default to `textMuted`, everything else to `textPrimary`. */
  color?: keyof ThemeColors;
  align?: TextAlign;
  numberOfLines?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

type AlignStyleName = 'alignAuto' | 'alignLeft' | 'alignRight' | 'alignCenter' | 'alignJustify';

type TextLineStyles = ReturnType<typeof useTextLineStyles>['styles'];

type WordFit = {
  key: string;
  scale: number;
};

/** A line may end after a space, a dash, a dot separator or a slash; anywhere else a word broke. */
const BREAK_ALLOWED_AFTER = /[\s\-\u2010\u2013\u2014·/]$/u;
const WORD_FIT_STEP = 0.85;

const ALIGN_STYLE: Record<TextAlign, AlignStyleName> = {
  auto: 'alignAuto',
  left: 'alignLeft',
  right: 'alignRight',
  center: 'alignCenter',
  justify: 'alignJustify'
};

const resolveDefaultColor = (variant: TextLineVariant): keyof ThemeColors => {
  if (variant === 'caption') {
    return 'textMuted';
  }
  return 'textPrimary';
};

const hasBrokenWord = (lines: readonly {text: string}[]): boolean =>
  lines.slice(0, -1).some((line) => !BREAK_ALLOWED_AFTER.test(line.text));

/** The fit belongs to one text at one system font size; a new text or size starts from 1. */
const describeFitKey = (children: ReactNode, fontScale: number): string => {
  if (typeof children === 'string' || typeof children === 'number') {
    return `${fontScale}|${children}`;
  }
  return String(fontScale);
};

const resolveFitScale = (fit: WordFit, fitKey: string): number => {
  if (fit.key !== fitKey) {
    return 1;
  }
  return fit.scale;
};

const scaleVariant = (variantStyle: TextStyle, scale: number): TextStyle | null => {
  if (scale >= 1 || !variantStyle.fontSize || !variantStyle.lineHeight) {
    return null;
  }
  return {
    fontSize: variantStyle.fontSize * scale,
    lineHeight: variantStyle.lineHeight * scale
  };
};

const resolveAlignStyle = (
  styles: TextLineStyles,
  align: TextAlign | undefined
): TextStyle | null => {
  if (!align) {
    return null;
  }
  return styles[ALIGN_STYLE[align]];
};

const pickLayoutHandler = (
  isEnabled: boolean,
  handler: (event: TextLayoutEvent) => void
): ((event: TextLayoutEvent) => void) | undefined => {
  if (!isEnabled) {
    return undefined;
  }
  return handler;
};

/**
 * The only way to render text: brand families, sizes and colors live in its variants. Texts grow
 * with the system font; when a large system size would break a word in the middle, this text
 * alone shrinks step by step until every word fits on a line, never below its standard size.
 */
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
  const {styles, dimensions} = useTextLineStyles();
  const [fit, setFit] = useState<WordFit>({key: '', scale: 1});
  const fitKey = describeFitKey(children, dimensions.fontScale);
  const scale = resolveFitScale(fit, fitKey);
  const colorStyle = styles[color ?? resolveDefaultColor(variant)];
  const alignStyle = resolveAlignStyle(styles, align);
  const fittedSize = scaleVariant(styles[variant], scale);
  // Never smaller than the same text at the standard system size.
  const nextScale = Math.max(scale * WORD_FIT_STEP, 1 / dimensions.fontScale);
  const keepWordsWhole = (event: TextLayoutEvent) => {
    if (nextScale >= scale || !hasBrokenWord(event.nativeEvent.lines)) {
      return;
    }
    setFit({key: fitKey, scale: nextScale});
  };
  const onTextLayout = pickLayoutHandler(
    numberOfLines === undefined && dimensions.fontScale > 1,
    keepWordsWhole
  );
  return (
    <Text
      style={[styles[variant], fittedSize, colorStyle, alignStyle, style]}
      numberOfLines={numberOfLines}
      onTextLayout={onTextLayout}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </Text>
  );
};

const useTextLineStyles = getResponsiveStylesHook(({colors}) =>
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
    },
    // One text color per palette key, picked by the `color` prop
    background: {color: colors.background},
    textPrimary: {color: colors.textPrimary},
    card: {color: colors.card},
    accent: {color: colors.accent},
    textOnAccent: {color: colors.textOnAccent},
    surfaceSecondary: {color: colors.surfaceSecondary},
    textMuted: {color: colors.textMuted},
    border: {color: colors.border},
    accentText: {color: colors.accentText},
    beak: {color: colors.beak},
    success: {color: colors.success},
    error: {color: colors.error},
    // One style per value of the `align` prop
    alignAuto: {textAlign: 'auto'},
    alignLeft: {textAlign: 'left'},
    alignRight: {textAlign: 'right'},
    alignCenter: {textAlign: 'center'},
    alignJustify: {textAlign: 'justify'}
  })
);
