import {StyleSheet, View} from 'react-native';
import {LIMITS} from '@/src/constants/LIMITS';
import {SPACING} from '@/src/constants/UI_SIZES';
import {Illustration} from '@/src/components/ui/Illustration';
import {TextLine} from '@/src/components/ui/TextLine';
import {useTranslation} from '@/src/i18n/useTranslation';
import {STATEMENT_REJECTION} from '@/src/utils/files/checkStatementFile';
import {formatExactBytes} from '@/src/utils/format/formatFileSize';
import {getResponsiveStylesHook} from '@/src/utils/styles/getResponsiveStylesHook';

type FileRejectionProps = {
  rejection: STATEMENT_REJECTION;
  sizeBytes: number;
};

/** Why the file was refused on the phone, and that nothing reached the server. */
export const FileRejection = ({rejection, sizeBytes}: FileRejectionProps) => {
  const {styles} = useFileRejectionStyles();
  const {t, language} = useTranslation();
  const sizeLine =
    rejection === STATEMENT_REJECTION.TOO_LARGE ? (
      <TextLine variant="money" testID="import_confirm_size_text">
        {t.importConfirm.sizeAgainstLimit(
          formatExactBytes(sizeBytes, language),
          formatExactBytes(LIMITS.MAX_FILE_SIZE_BYTES, language)
        )}
      </TextLine>
    ) : null;
  return (
    <View style={styles.block}>
      <Illustration name="rejected" />
      <TextLine variant="display" accessibilityRole="header">
        {t.importConfirm.rejectedTitle}
      </TextLine>
      <TextLine variant="title" testID="import_confirm_rejection_text">
        {t.importConfirm.rejection[rejection]}
      </TextLine>
      {sizeLine}
      <TextLine>{t.importConfirm.expectedFiles}</TextLine>
      <TextLine variant="caption">{t.importConfirm.nothingSent}</TextLine>
    </View>
  );
};

const useFileRejectionStyles = getResponsiveStylesHook(() =>
  StyleSheet.create({
    block: {
      gap: SPACING.md
    }
  })
);
