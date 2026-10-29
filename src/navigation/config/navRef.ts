import {createNavigationContainerRef} from '@react-navigation/native';
import {RootStackParamList} from '@/src/navigation/types';

/** Navigation outside React; use only after `navRef.isReady()`. */
export const navRef = createNavigationContainerRef<RootStackParamList>();
