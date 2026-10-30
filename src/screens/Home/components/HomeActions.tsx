import {MainButton} from '@/src/components/ui/MainButton';
import {OptionalText} from '@/src/components/ui/OptionalText';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useImportStore} from '@/src/stores/importStore';
import {canAddStatement} from '@/src/utils/import/canAddStatement';

type HomeActionsProps = {
  isPicking: boolean;
  onAdd: () => void;
  onOpenDiagnostics: () => void;
};

/** "Add statement", blocked with its reason while an import is in progress, and the diagnostics. */
export const HomeActions = ({isPicking, onAdd, onOpenDiagnostics}: HomeActionsProps) => {
  const {t} = useTranslation();
  const isAddingAllowed = useImportStore((state) => canAddStatement(state.operation, state.draft));
  const isAddBlocked = !isAddingAllowed;
  return (
    <>
      <MainButton
        title={t.home.addStatement}
        onPress={onAdd}
        loading={isPicking}
        disabled={isAddBlocked}
        testID="home_add_statement_button"
      />
      <OptionalText
        isVisible={isAddBlocked}
        text={t.home.addStatementBlocked}
        variant="caption"
        align="center"
        testID="home_add_blocked_text"
      />
      <MainButton
        title={t.home.diagnostics}
        variant="quiet"
        onPress={onOpenDiagnostics}
        testID="home_diagnostics_link"
      />
    </>
  );
};
