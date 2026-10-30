import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {SPACING} from '@/src/constants/UI_SIZES';
import {TextLine, TextLineVariant} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type InfoRowProps = {
  label: string;
  value: string;
  /** `money` for sizes, amounts, dates and ids; `body` for words. */
  valueVariant?: TextLineVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** A label over its value; the value wraps instead of being cut at a large font size. */
export const InfoRow = ({label, value, valueVariant = 'body', style, testID}: InfoRowProps) => {
  const {styles} = useInfoRowStyles();
  const {t} = useTranslation();
  const accessibilityLabel = t.common.labelValue(label, value);
  return (
    <View testID={testID} collapsable={false} style={style}>
      <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
        <TextLine variant="caption">{label}</TextLine>
        <TextLine variant={valueVariant}>{value}</TextLine>
      </View>
    </View>
  );
};

const useInfoRowStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    row: {
      gap: SPACING.xs
    }
  })
);
