import {useNavigation} from '@react-navigation/native';
import {AppNavigation} from '@/src/navigation/types';

export const useAppNavigation = (): AppNavigation => {
  return useNavigation<AppNavigation>();
};
