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
    <View style={[styles.card, style]} testID={testID}>
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
