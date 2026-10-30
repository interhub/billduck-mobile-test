import {ReactNode} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {BORDER_WIDTH, RADIUS, SPACING} from '@/src/constants/UI_SIZES';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A white (or dark) block with a thin border: details, totals, payments. */
export const Card = ({children, style, testID}: CardProps) => {
  const {styles} = useCardStyles();
  return (
    <View testID={testID} collapsable={false} style={[styles.card, style]}>
      {children}
    </View>
  );
};

const useCardStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    card: {
      gap: SPACING.md,
      padding: SPACING.lg,
      borderRadius: RADIUS.card,
      borderWidth: BORDER_WIDTH,
      borderColor: colors.border,
      backgroundColor: colors.card
    }
  })
);
