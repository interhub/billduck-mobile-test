import {MainButton} from '@/src/components/ui/MainButton';
import {ImportSubject} from '@/src/hooks/import/useImportSubject';
import {useTranslation} from '@/src/i18n/useTranslation';
import {
  describeActionTitle,
  resolveStatusActions,
  STATUS_ACTION,
  StatusActionHandlers,
  StatusActionId
} from '@/src/screens/Import/logic/resolveStatusActions';
import {ImportFailure} from '@/src/types/importOperation';

type StatusActionButtonProps = {
  actionId: StatusActionId;
  failure: ImportFailure | null;
  onPress: () => void;
};

const StatusActionButton = ({actionId, failure, onPress}: StatusActionButtonProps) => {
  const {t} = useTranslation();
  const {variant, testID} = STATUS_ACTION[actionId];
  const title = describeActionTitle(actionId, failure, t);
  return <MainButton title={title} variant={variant} onPress={onPress} testID={testID} />;
};

type StatusActionsProps = {
  subject: ImportSubject;
  failure: ImportFailure | null;
  handlers: StatusActionHandlers;
};

/** The actions of the current phase: one yellow button at most, the rest quiet. */
export const StatusActions = ({subject, failure, handlers}: StatusActionsProps) => {
  const buttons = resolveStatusActions(subject).map((actionId) => (
    <StatusActionButton
      key={actionId}
      actionId={actionId}
      failure={failure}
      onPress={handlers[actionId]}
    />
  ));
  return <>{buttons}</>;
};
