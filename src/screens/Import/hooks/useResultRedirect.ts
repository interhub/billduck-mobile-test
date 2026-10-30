import {useIsFocused} from '@react-navigation/native';
import {useEffect} from 'react';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {BadgePhase} from '@/src/utils/import/importPhases';

/**
 * The report lives only while the statement is ready. Any other phase (a deletion, a job the
 * server no longer knows) moves to the status screen, and with no import at all it goes home.
 */
export const useResultRedirect = (phase: BadgePhase | null): void => {
  const navigation = useAppNavigation();
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused || phase === 'ready') {
      return;
    }
    if (!phase) {
      navigation.popTo(SCREEN_NAME.HOME);
      return;
    }
    navigation.replace(SCREEN_NAME.IMPORT_STATUS);
  }, [isFocused, phase, navigation]);
};
