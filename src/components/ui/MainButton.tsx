import {ReactNode} from 'react';
import {ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {ThemeColors} from '@/src/constants/UI_COLORS';
import {BORDER_WIDTH, RADIUS, SPACING, TOUCH_TARGET} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

export type MainButtonVariant = 'primary' | 'secondary' | 'destructive' | 'quiet';

type MainButtonProps = {
  title: string;
  onPress: () => void;
  variant?: MainButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Defaults to the title. */
  accessibilityLabel?: string;
  /** A Phosphor icon drawn before the title. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const TEXT_COLOR: Record<MainButtonVariant, keyof ThemeColors> = {
  primary: 'textOnAccent',
  secondary: 'textPrimary',
  destructive: 'error',
  quiet: 'textMuted'
};

/** Every screen action. `loading` and `disabled` block presses and say so to screen readers. */
export const MainButton = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityLabel,
  icon,
  style,
  testID
}: MainButtonProps) => {
  const {styles, colors} = useMainButtonStyles();
  const isBlocked = loading || disabled;
  const textColor = TEXT_COLOR[variant];
  const leading = loading ? <ActivityIndicator color={colors[textColor]} /> : icon;
  return (
    <View testID={testID} collapsable={false} style={style}>
      <TouchableScaleView
        onPress={onPress}
        disabled={isBlocked}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{disabled: isBlocked, busy: loading}}
        style={[styles.button, styles[variant], disabled && styles.disabled]}
      >
        {leading}
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
      opacity: 0.45
    },
    title: {
      flexShrink: 1
    }
  })
);
