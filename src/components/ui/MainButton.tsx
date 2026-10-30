import {ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {
  BORDER_WIDTH,
  DISABLED_OPACITY,
  RADIUS,
  SPACING,
  TOUCH_TARGET
} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type MainButtonVariant = 'primary' | 'secondary' | 'destructive' | 'quiet';

type MainButtonProps = {
  title: string;
  onPress: () => void;
  variant?: MainButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Defaults to the title. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TEXT_COLOR: Record<MainButtonVariant, keyof ThemeColors> = {
  primary: 'textOnAccent',
  secondary: 'textPrimary',
  destructive: 'error',
  quiet: 'textMuted'
};

const pickDisabledStyle = (isDisabled: boolean, disabledStyle: ViewStyle): ViewStyle | null => {
  if (!isDisabled) {
    return null;
  }
  return disabledStyle;
};

type ButtonSpinnerProps = {
  isLoading: boolean;
  color: keyof ThemeColors;
};

const ButtonSpinner = ({isLoading, color}: ButtonSpinnerProps) => {
  const colors = useThemeColors();
  if (!isLoading) {
    return null;
  }
  return <ActivityIndicator color={colors[color]} />;
};

/** Every screen action. `loading` and `disabled` block presses and say so to screen readers. */
export const MainButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
  testID
}: MainButtonProps) => {
  const {styles} = useMainButtonStyles();
  const isBlocked = loading || disabled;
  const buttonLabel = accessibilityLabel ?? title;
  const textColor = TEXT_COLOR[variant];
  const buttonStyle: StyleProp<ViewStyle> = [
    styles.button,
    styles[variant],
    pickDisabledStyle(disabled, styles.disabled)
  ];
  return (
    <View testID={testID} collapsable={false} style={style}>
      <TouchableScaleView
        onPress={onPress}
        disabled={isBlocked}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityState={{disabled: isBlocked, busy: loading}}
        style={buttonStyle}
      >
        <ButtonSpinner isLoading={loading} color={textColor} />
        <TextLine variant="label" color={textColor} align="center" style={styles.title}>
          {title}
        </TextLine>
      </TouchableScaleView>
    </View>
  );
};

const useMainButtonStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    button: {
      minHeight: TOUCH_TARGET,
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.button
    },
    primary: {
      backgroundColor: colors.accent
    },
    secondary: {
      backgroundColor: colors.surfaceSecondary
    },
    destructive: {
      backgroundColor: colors.card,
      borderWidth: BORDER_WIDTH,
      borderColor: colors.border
    },
    quiet: {
      backgroundColor: 'transparent'
    },
    disabled: {
      opacity: DISABLED_OPACITY
    },
    title: {
      flexShrink: 1
    }
  })
);
