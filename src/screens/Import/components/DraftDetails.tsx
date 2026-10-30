import {Card} from '@/src/components/ui/Card';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {OptionalText} from '@/src/components/ui/OptionalText';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useImportStore} from '@/src/stores/importStore';
import {ImportDraft} from '@/src/types/importDraft';
import {StatementFormat} from '@/src/types/importOperation';
import {formatFileSize} from '@/src/utils/format/formatFileSize';
import {formatStatementFormat, formatStatementTitle} from '@/src/utils/format/formatStatementTitle';
import {hasServerJob} from '@/src/utils/import/importPhases';

type DraftDetailsProps = {
  draft: ImportDraft;
  format: StatementFormat;
};

/**
 * The checked file: its original name (shown only here, from memory), size, format and the title
 * it will have in the app; said up front when the statement on the server goes first.
 */
export const DraftDetails = ({draft, format}: DraftDetailsProps) => {
  const {t, language} = useTranslation();
  const isPreviousOnServer = useImportStore(
    (state) => state.operation !== null && hasServerJob(state.operation)
  );
  const sizeText = formatFileSize(draft.sizeBytes, language);
  const formatText = formatStatementFormat(format);
  const storedTitle = formatStatementTitle(
    {createdAt: draft.createdAt, file: {sizeBytes: draft.sizeBytes, format}},
    language
  );
  return (
    <>
      <Card>
        <InfoRow
          label={t.importConfirm.fileLabel}
          value={draft.originalName}
          testID="import_confirm_name_text"
        />
        <InfoRow label={t.importConfirm.sizeLabel} value={sizeText} valueVariant="money" />
        <InfoRow label={t.importConfirm.formatLabel} value={formatText} valueVariant="money" />
        <InfoRow label={t.importConfirm.titleLabel} value={storedTitle} />
      </Card>
      <TextLine variant="caption">{t.importConfirm.nameNote}</TextLine>
      <OptionalText
        isVisible={isPreviousOnServer}
        text={t.importConfirm.replaceNote}
        testID="import_confirm_replace_text"
      />
    </>
  );
};
