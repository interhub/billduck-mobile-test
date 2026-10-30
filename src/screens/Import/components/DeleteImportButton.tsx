import {Alert} from 'react-native';
import {MainButton} from '@/src/components/ui/MainButton';
import {useTranslation} from '@/src/i18n/useTranslation';

type DeleteImportButtonProps = {
  onDelete: () => void;
};

/** "Delete import" asks first: the statement and its report leave the server. */
export const DeleteImportButton = ({onDelete}: DeleteImportButtonProps) => {
  const {t} = useTranslation();
  const confirmDelete = () => {
    Alert.alert(t.importResult.deleteQuestion, t.importResult.deleteExplanation, [
      {text: t.common.cancel, style: 'cancel'},
      {text: t.importResult.deleteAction, style: 'destructive', onPress: onDelete}
    ]);
  };
  return (
    <MainButton
      title={t.importResult.deleteImport}
      variant="destructive"
      onPress={confirmDelete}
      testID="import_result_delete_button"
    />
  );
};
