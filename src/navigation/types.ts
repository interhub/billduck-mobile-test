import {NativeStackNavigationProp} from '@react-navigation/native-stack';

export enum SCREEN_NAME {
  HOME = 'HOME',
  IMPORT_CONFIRM = 'IMPORT_CONFIRM',
  IMPORT_STATUS = 'IMPORT_STATUS',
  IMPORT_RESULT = 'IMPORT_RESULT',
  PAYMENT_DETAILS = 'PAYMENT_DETAILS',
  DIAGNOSTICS = 'DIAGNOSTICS'
}

export type RootStackParamList = {
  [SCREEN_NAME.HOME]: undefined;
  [SCREEN_NAME.IMPORT_CONFIRM]: undefined;
  [SCREEN_NAME.IMPORT_STATUS]: undefined;
  [SCREEN_NAME.IMPORT_RESULT]: undefined;
  [SCREEN_NAME.PAYMENT_DETAILS]: {paymentId: string};
  [SCREEN_NAME.DIAGNOSTICS]: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
