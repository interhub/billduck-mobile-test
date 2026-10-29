import {CaretLeftIcon} from 'phosphor-react-native/src/icons/CaretLeft';
import {StyleSheet, View} from 'react-native';
import {ICON_SIZE, SCREEN_PADDING, SPACING, TOUCH_TARGET} from '@/src/constants/UI_SIZES';
import {TextLine} from '@/src/components/ui/TextLine';
import {TouchableScaleView} from '@/src/components/ui/TouchableScaleView';
import {useTranslation} from '@/src/i18n/useTranslation';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ScreenHeaderProps = {
  onBack: () => void;
  testID: string;
};

/** The pinned top row of a pushed screen: the back action. */
export const ScreenHeader = ({onBack, testID}: ScreenHeaderProps) => {
  const {styles, colors} = useScreenHeaderStyles();
  const {t} = useTranslation();
  return (
    <View style={styles.row}>
      <View testID={testID} collapsable={false}>
        <TouchableScaleView
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          hitSlop={SPACING.sm}
          style={styles.backButton}
        >
          <CaretLeftIcon size={ICON_SIZE.md} color={colors.textPrimary} weight="regular" />
          <TextLine variant="label">{t.common.back}</TextLine>
        </TouchableScaleView>
      </View>
    </View>
  );
};

const useScreenHeaderStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingHorizontal: SCREEN_PADDING - SPACING.sm,
      paddingTop: SPACING.xs
    },
    backButton: {
      minHeight: TOUCH_TARGET,
      gap: SPACING.xs,
      paddingHorizontal: SPACING.sm
    }
  })
);
