import {
  createNativeStackNavigator,
  NativeStackNavigationOptions
} from '@react-navigation/native-stack';
import {StyleSheet} from 'react-native';
import {useReduceMotion} from '@/src/hooks/sensors/useReduceMotion';
import {RootStackParamList, SCREEN_NAME} from '@/src/navigation/types';
import {DiagnosticsScreen} from '@/src/screens/Diagnostics/DiagnosticsScreen';
import {HomeScreen} from '@/src/screens/Home/HomeScreen';
import {ImportConfirmScreen} from '@/src/screens/Import/ImportConfirmScreen';
import {ImportResultScreen} from '@/src/screens/Import/ImportResultScreen';
import {ImportStatusScreen} from '@/src/screens/Import/ImportStatusScreen';
import {PaymentDetailsScreen} from '@/src/screens/Import/PaymentDetailsScreen';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

const Stack = createNativeStackNavigator<RootStackParamList>();

const resolveAnimation = (
  isReduceMotionEnabled: boolean
): NativeStackNavigationOptions['animation'] => {
  if (isReduceMotionEnabled) {
    return 'none';
  }
  return 'default';
};

/** One native stack; every screen draws its own header inside ScreenLayout. */
export const RootNavigator = () => {
  const {styles} = useRootNavigatorStyles();
  const isReduceMotionEnabled = useReduceMotion();
  const screenOptions: NativeStackNavigationOptions = {
    headerShown: false,
    animation: resolveAnimation(isReduceMotionEnabled),
    contentStyle: styles.content
  };
  return (
    <Stack.Navigator initialRouteName={SCREEN_NAME.HOME} screenOptions={screenOptions}>
      <Stack.Screen name={SCREEN_NAME.HOME} component={HomeScreen} />
      <Stack.Screen name={SCREEN_NAME.IMPORT_CONFIRM} component={ImportConfirmScreen} />
      <Stack.Screen name={SCREEN_NAME.IMPORT_STATUS} component={ImportStatusScreen} />
      <Stack.Screen name={SCREEN_NAME.IMPORT_RESULT} component={ImportResultScreen} />
      <Stack.Screen name={SCREEN_NAME.PAYMENT_DETAILS} component={PaymentDetailsScreen} />
      <Stack.Screen name={SCREEN_NAME.DIAGNOSTICS} component={DiagnosticsScreen} />
    </Stack.Navigator>
  );
};

const useRootNavigatorStyles = getResponsiveStylesHook(({colors}) =>
  StyleSheet.create({
    content: {
      backgroundColor: colors.background
    }
  })
);
