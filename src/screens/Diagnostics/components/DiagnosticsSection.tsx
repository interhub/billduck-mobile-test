import {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type DiagnosticsSectionProps = {
  title: string;
  children: ReactNode;
};

/** One block of the diagnostics screen under its own small header. */
export const DiagnosticsSection = ({title, children}: DiagnosticsSectionProps) => {
  const {styles} = useDiagnosticsSectionStyles();
  return (
    <View style={styles.section}>
      <TextLine variant="label" accessibilityRole="header">
        {title}
      </TextLine>
      {children}
    </View>
  );
};

const useDiagnosticsSectionStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    section: {
      gap: SPACING.md
    }
  })
);
