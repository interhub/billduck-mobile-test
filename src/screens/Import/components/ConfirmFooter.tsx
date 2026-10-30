import {ReactNode} from 'react';
import {MainButton} from '@/src/components/ui/MainButton';
import {useTranslation} from '@/src/i18n/useTranslation';

type ConfirmFooterProps = {
  /** The main action, shown above "Cancel". */
  children: ReactNode;
  onCancel: () => void;
};

/** The footer of the confirm screen: its main action, then the quiet "Cancel". */
export const ConfirmFooter = ({children, onCancel}: ConfirmFooterProps) => {
  const {t} = useTranslation();
  return (
    <>
      {children}
      <MainButton
        title={t.common.cancel}
        variant="quiet"
        onPress={onCancel}
        testID="import_confirm_cancel_button"
      />
    </>
  );
};
