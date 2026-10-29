import {ReactNode} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SCREEN_PADDING, SPACING} from '@/src/constants/UI_SIZES';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ScreenLayoutProps = {
  header?: ReactNode;
  children: ReactNode;
  /** The main buttons, pinned under the scrolling content. */
  footer?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  testID: string;
};

/**
 * The root of every screen: safe area, theme background, scrolling content with pull to
 * refresh, and a pinned footer, so the main actions stay reachable at any font size.
 */
export const ScreenLayout = ({
  header,
  children,
  footer,
  onRefresh,
  refreshing = false,
  testID
}: ScreenLayoutProps) => {
  const {styles, colors} = useScreenLayoutStyles();
  const refreshControl = onRefresh ? (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
  ) : undefined;
  const footerBlock = footer ? <View style={styles.footer}>{footer}</View> : null;
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
      testID={testID}
    >
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footerBlock}
    </SafeAreaView>
  );
};

const useScreenLayoutStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background
    },
    scroll: {
      flex: 1
    },
    content: {
      flexGrow: 1,
      gap: SPACING.xl,
      paddingHorizontal: SCREEN_PADDING,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.xxl
    },
    footer: {
      gap: SPACING.sm,
      paddingHorizontal: SCREEN_PADDING,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
      backgroundColor: colors.background
    }
  })
);
