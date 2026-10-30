import {ReactElement, ReactNode} from 'react';
import {RefreshControl, RefreshControlProps, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SCREEN_PADDING, SPACING} from '@/src/constants/UI_SIZES';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

/**
 * No pull to refresh means no control at all: on Android the ScrollView renders inside the
 * control it gets, so a control that renders nothing would hide the screen.
 */
const createRefreshControl = (
  onRefresh: (() => void) | undefined,
  refreshing: boolean,
  tintColor: string
): ReactElement<RefreshControlProps> | undefined => {
  if (!onRefresh) {
    return undefined;
  }
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />;
};

type PinnedFooterProps = {
  children?: ReactNode;
};

const PinnedFooter = ({children}: PinnedFooterProps) => {
  const {styles} = useScreenLayoutStyles();
  if (!children) {
    return null;
  }
  return <View style={styles.footer}>{children}</View>;
};

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
  const refreshControl = createRefreshControl(onRefresh, refreshing, colors.textMuted);
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
      <PinnedFooter>{footer}</PinnedFooter>
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
