import {useState} from 'react';
import {importController} from '@/src/services/importController/importController';

type AddStatement = {
  isPicking: boolean;
  addStatement: () => Promise<void>;
};

/** "Add statement": opens the system picker and hands a picked file on through `onPicked`. */
export const useAddStatement = (onPicked: () => void): AddStatement => {
  const [isPicking, setIsPicking] = useState(false);
  const addStatement = async () => {
    setIsPicking(true);
    try {
      const isPicked = await importController.pickFile();
      if (isPicked) {
        onPicked();
      }
    } finally {
      setIsPicking(false);
    }
  };
  return {isPicking, addStatement};
};
