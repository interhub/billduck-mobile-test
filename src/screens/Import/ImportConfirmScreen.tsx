import {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useShallow} from 'zustand/react/shallow';
import {Card} from '@/src/components/ui/Card';
import {Illustration} from '@/src/components/ui/Illustration';
import {InfoRow} from '@/src/components/ui/InfoRow';
import {MainButton} from '@/src/components/ui/MainButton';
import {ScreenHeader} from '@/src/components/ui/ScreenHeader';
import {ScreenLayout} from '@/src/components/ui/ScreenLayout';
import {TextLine} from '@/src/components/ui/TextLine';
import {SPACING} from '@/src/constants/UI_SIZES';
import {useThemeColors} from '@/src/hooks/styles/useThemeColors';
import {useTranslation} from '@/src/i18n/useTranslation';
import {useAppNavigation} from '@/src/navigation/hooks/useAppNavigation';
import {SCREEN_NAME} from '@/src/navigation/types';
import {FileRejection} from '@/src/screens/Import/components/FileRejection';
import {importController} from '@/src/services/importController/importController';
import {useImportStore} from '@/src/stores/importStore';
import {ImportOperation} from '@/src/types/importOperation';
import {formatFileSize} from '@/src/utils/format/formatFileSize';
import {formatStatementFormat, formatStatementTitle} from '@/src/utils/format/formatStatementTitle';
import {hasServerJob} from '@/src/utils/import/importReducer';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type ReplaceNoteProps = {
  operation: ImportOperation | null;
};

/** Said up front when the statement on the server is deleted before the new one is sent. */
const ReplaceNote = ({operation}: ReplaceNoteProps) => {
  const {t} = useTranslation();
  if (!operation || !hasServerJob(operation)) {
    return null;
  }
  return <TextLine testID="import_confirm_replace_text">{t.importConfirm.replaceNote}</TextLine>;
};

export const ImportConfirmScreen = () => {
  const {styles} = useImportConfirmScreenStyles();
  const colors = useThemeColors();
  const {t, language} = useTranslation();
  const navigation = useAppNavigation();
  const {draft, operation} = useImportStore(
    useShallow((state) => ({draft: state.draft, operation: state.operation}))
  );
  const [isSending, setIsSending] = useState(false);
  // Leaving the screen without sending drops the picked copy; a sent draft is no longer cancellable.
  useEffect(() => {
    return () => {
      importController.cancelDraft();
    };
  }, []);
  const close = () => {
    importController.cancelDraft();
    navigation.goBack();
  };
  const send = () => {
    if (isSending) {
      return;
    }
    setIsSending(true);
    void importController.send();
    navigation.replace(SCREEN_NAME.IMPORT_STATUS);
  };
  const chooseAnother = async () => {
    importController.cancelDraft();
    const isPicked = await importController.pickFile();
    if (!isPicked) {
      navigation.goBack();
    }
  };
  const header = <ScreenHeader onBack={close} testID="import_confirm_back_button" />;
  if (!draft || draft.phase === 'validating') {
    return (
      <ScreenLayout testID="import_confirm_screen" header={header}>
        <View style={styles.centered}>
          <Illustration name="checking" />
          <ActivityIndicator color={colors.textMuted} />
          <TextLine align="center">{t.importConfirm.checking}</TextLine>
        </View>
      </ScreenLayout>
    );
  }
  if (draft.phase === 'rejected' && draft.rejection) {
    const rejectedFooter = (
      <>
        <MainButton
          title={t.importConfirm.chooseAnother}
          onPress={chooseAnother}
          testID="import_confirm_choose_another_button"
        />
        <MainButton
          title={t.common.cancel}
          variant="quiet"
          onPress={close}
          testID="import_confirm_cancel_button"
        />
      </>
    );
    return (
      <ScreenLayout testID="import_confirm_screen" header={header} footer={rejectedFooter}>
        <FileRejection rejection={draft.rejection} sizeBytes={draft.sizeBytes} />
      </ScreenLayout>
    );
  }
  const format = draft.format ?? 'csv';
  const storedTitle = formatStatementTitle(
    {createdAt: draft.createdAt, file: {sizeBytes: draft.sizeBytes, format}},
    language
  );
  const footer = (
    <>
      <MainButton
        title={t.importConfirm.send}
        onPress={send}
        loading={isSending}
        testID="import_confirm_send_button"
      />
      <MainButton
        title={t.common.cancel}
        variant="quiet"
        onPress={close}
        testID="import_confirm_cancel_button"
      />
    </>
  );
  return (
    <ScreenLayout testID="import_confirm_screen" header={header} footer={footer}>
      <TextLine variant="display" accessibilityRole="header">
        {t.importConfirm.title}
      </TextLine>
      <Card>
        <InfoRow
          label={t.importConfirm.fileLabel}
          value={draft.originalName}
          testID="import_confirm_name_text"
        />
        <InfoRow
          label={t.importConfirm.sizeLabel}
          value={formatFileSize(draft.sizeBytes, language)}
          valueVariant="money"
        />
        <InfoRow
          label={t.importConfirm.formatLabel}
          value={formatStatementFormat(format)}
          valueVariant="money"
        />
        <InfoRow label={t.importConfirm.titleLabel} value={storedTitle} />
      </Card>
      <TextLine variant="caption">{t.importConfirm.nameNote}</TextLine>
      <ReplaceNote operation={operation} />
    </ScreenLayout>
  );
};

const useImportConfirmScreenStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    centered: {
      gap: SPACING.lg,
      alignItems: 'center',
      paddingTop: SPACING.xl
    }
  })
);
