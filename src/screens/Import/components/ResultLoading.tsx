import {ActivityIndicator} from 'react-native';
import {StatusBadge} from '@/src/components/ui/StatusBadge';
import {TextLine} from '@/src/components/ui/TextLine';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useImportStore} from '@/src/stores/importStore';
import {BadgePhase} from '@/src/utils/import/importPhases';

type StoredPhaseBadgeProps = {
  phase: BadgePhase | null;
};

/** The status of the stored operation; nothing once no operation is stored any more. */
const StoredPhaseBadge = ({phase}: StoredPhaseBadgeProps) => {
  const isOperationStored = useImportStore((state) => state.operation !== null);
  if (!phase || !isOperationStored) {
    return null;
  }
  return <StatusBadge phase={phase} />;
};

type ResultLoadingProps = {
  phase: BadgePhase | null;
};

/** The report before its payments arrive from the server: the status and a spinner. */
export const ResultLoading = ({phase}: ResultLoadingProps) => {
  const colors = useThemeColors();
  const {t} = useTranslation();
  return (
    <>
      <StoredPhaseBadge phase={phase} />
      <ActivityIndicator color={colors.textMuted} />
      <TextLine>{t.importResult.loadingPayments}</TextLine>
    </>
  );
};
