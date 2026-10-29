import {useNavigation} from '@react-navigation/native';
import {AppNavigation} from '@/src/navigation/types';

/** The typed navigation object of the root stack. */
export const useAppNavigation = (): AppNavigation => {
  return useNavigation<AppNavigation>();
};
