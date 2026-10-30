import {useState} from 'react';
import {importController} from '@/src/services/importController/importController';

type StatusRefresh = {
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

/** Pull to refresh on the import screens: reads the status again and spins while it does. */
export const useStatusRefresh = (): StatusRefresh => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await importController.refreshStatus();
    } finally {
      setIsRefreshing(false);
    }
  };
  return {isRefreshing, refresh};
};
