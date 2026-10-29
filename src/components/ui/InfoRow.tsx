import {StyleSheet, View} from 'react-native';
import {SPACING} from '@/src/constants/UI_SIZES';
import {TextLine, TextLineVariant} from '@/src/components/ui/TextLine';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type InfoRowProps = {
  label: string;
  value: string;
  /** `money` for sizes, amounts, dates and ids; `body` for words. */
  valueVariant?: TextLineVariant;
  testID?: string;
};

/** A label over its value; the value wraps instead of being cut at a large font size. */
export const InfoRow = ({label, value, valueVariant = 'body', testID}: InfoRowProps) => {
  const {styles} = useInfoRowStyles();
  return (
    <View testID={testID} collapsable={false}>
      <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
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
