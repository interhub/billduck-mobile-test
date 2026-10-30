import {useShallow} from 'zustand/react/shallow';
import {Card} from '@/src/components/ui/Card';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useImportStore} from '@/src/stores/importStore';
import {ImportOperation} from '@/src/types/importOperation';

type StoredOperationRowsProps = {
  operation: ImportOperation | null;
};

const StoredOperationRows = ({operation}: StoredOperationRowsProps) => {
  const {t} = useTranslation();
  if (!operation) {
    return <TextLine variant="caption">{t.diagnostics.nothingStored}</TextLine>;
  }
  const jobId = operation.jobId ?? t.diagnostics.noValue;
  const revisionText = String(operation.revision);
  return (
    <>
      <InfoRow
        label={t.diagnostics.phaseLabel}
        value={operation.phase}
        valueVariant="money"
        testID="diagnostics_phase_text"
      />
      <InfoRow label={t.diagnostics.jobLabel} value={jobId} valueVariant="money" />
      <InfoRow label={t.diagnostics.revisionLabel} value={revisionText} valueVariant="money" />
    </>
  );
};

/** What this phone holds: the stored operation, the cleanups to check, the skipped answers. */
export const PhoneStateCard = () => {
  const {t} = useTranslation();
  const {operation, pendingCleanupCount, staleSkippedCount} = useImportStore(
    useShallow((state) => ({
      operation: state.operation,
      pendingCleanupCount: state.pendingCleanups.length,
      staleSkippedCount: state.staleSkippedCount
    }))
  );
  const pendingCleanupsText = String(pendingCleanupCount);
  const staleSkippedText = String(staleSkippedCount);
  return (
    <Card>
      <StoredOperationRows operation={operation} />
      <InfoRow
        label={t.diagnostics.pendingCleanups}
        value={pendingCleanupsText}
        valueVariant="money"
      />
      <InfoRow
        label={t.diagnostics.staleSkipped}
        value={staleSkippedText}
        valueVariant="money"
        testID="diagnostics_stale_skipped_text"
      />
    </Card>
  );
};
