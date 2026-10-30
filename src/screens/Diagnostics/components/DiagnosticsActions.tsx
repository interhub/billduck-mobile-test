import {Alert} from 'react-native';
import {MainButton} from '@/src/components/ui/MainButton';
import {useTranslation} from '@/src/i18n/useTranslation';

type DiagnosticsActionsProps = {
  isBusy: boolean;
  onRefresh: () => void;
  onResetAll: () => void;
};

/** "Refresh" and "Reset all"; the reset asks first, it erases the mock and the phone import. */
export const DiagnosticsActions = ({isBusy, onRefresh, onResetAll}: DiagnosticsActionsProps) => {
  const {t} = useTranslation();
  const confirmReset = () => {
    Alert.alert(t.diagnostics.resetQuestion, t.diagnostics.resetExplanation, [
      {text: t.common.cancel, style: 'cancel'},
      {text: t.diagnostics.resetAction, style: 'destructive', onPress: onResetAll}
    ]);
  };
  return (
    <>
      <MainButton
        title={t.diagnostics.refresh}
        variant="secondary"
        onPress={onRefresh}
        loading={isBusy}
        testID="diagnostics_refresh_button"
      />
      <MainButton
        title={t.diagnostics.resetAll}
        variant="destructive"
        onPress={confirmReset}
        disabled={isBusy}
        testID="diagnostics_reset_button"
      />
    </>
  );
};
