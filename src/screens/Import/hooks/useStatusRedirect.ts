import {useEffect} from 'react';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {ImportOutcome} from '@/src/types/importDraft';

/** "Deleted" is confirmed by the server: the import is over, and the main screen says so. */
export const useStatusRedirect = (outcome: ImportOutcome | null): void => {
  const navigation = useAppNavigation();
  useEffect(() => {
    if (outcome?.kind === 'deleted') {
      navigation.popTo(SCREEN_NAME.HOME);
    }
  }, [outcome, navigation]);
};
