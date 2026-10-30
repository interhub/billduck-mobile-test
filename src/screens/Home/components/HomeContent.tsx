import {StyleSheet, View} from 'react-native';
import {Illustration} from '@/src/components/ui/Illustration';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useTranslation} from '@/src/i18n/useTranslation';
import {CurrentImportCard} from '@/src/screens/Home/components/CurrentImportCard';
import {isHomeEmpty} from '@/src/screens/Home/logic/isHomeEmpty';
import {useImportStore} from '@/src/stores/importStore';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type HomeContentProps = {
  onOpenCurrentImport: () => void;
};

/** The empty state with its picture, or the card of the current import. */
export const HomeContent = ({onOpenCurrentImport}: HomeContentProps) => {
  const {styles} = useHomeContentStyles();
  const {t} = useTranslation();
  const isEmpty = useImportStore((state) => isHomeEmpty(state.operation, state.draft));
  if (!isEmpty) {
    return <CurrentImportCard onPress={onOpenCurrentImport} />;
  }
  return (
    <View style={styles.empty}>
      <Illustration name="empty" />
      <TextLine>{t.common.noStatements}</TextLine>
    </View>
  );
};

const useHomeContentStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    empty: {
      gap: SPACING.xl,
      paddingTop: SPACING.lg
    }
  })
);
