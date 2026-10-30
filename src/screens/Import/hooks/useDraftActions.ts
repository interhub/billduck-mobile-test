import {useEffect, useRef, useState} from 'react';
import {importController} from '@/src/services/importController/importController';

type DraftExits = {
  /** The screen goes back: the person closed it or kept no file. */
  onLeave: () => void;
  /** The screen moves on to the status of the file it sent. */
  onSent: () => void;
};

type DraftActions = {
  isSending: boolean;
  close: () => void;
  send: () => void;
  chooseAnother: () => Promise<void>;
};

/**
 * The picked file on the confirm screen. A file that was never sent is dropped with its copy
 * when the screen goes, whatever way it goes; a sent file belongs to the import from then on.
 */
export const useDraftActions = ({onLeave, onSent}: DraftExits): DraftActions => {
  const [isSending, setIsSending] = useState(false);
  const isSentRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!isSentRef.current) {
        importController.cancelDraft();
      }
    };
  }, []);
  const close = () => {
    importController.cancelDraft();
    onLeave();
  };
  const send = () => {
    if (isSentRef.current) {
      return;
    }
    isSentRef.current = true;
    setIsSending(true);
    void importController.send();
    onSent();
  };
  const chooseAnother = async () => {
    importController.cancelDraft();
    const isPicked = await importController.pickFile();
    if (!isPicked) {
      onLeave();
    }
  };
  return {isSending, close, send, chooseAnother};
};
