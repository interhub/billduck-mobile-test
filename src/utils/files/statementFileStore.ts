import {getDocumentAsync} from 'expo-document-picker';
import {Directory, File, FileMode, Paths} from 'expo-file-system';
import {Platform} from 'react-native';
import {StatementFileStore} from '@/src/types/statementFiles';
import {resolveErrorKind} from '@/src/utils/errors/resolveErrorKind';
import {logger} from '@/src/utils/logger/logger';
import {LOG_NAME, LOG_TYPE} from '@/src/utils/logger/LOG_NAME';

const IMPORTS_DIRECTORY = 'imports';
/** expo-document-picker copies the chosen file into this cache subfolder on both platforms. */
const PICKER_DIRECTORY = 'DocumentPicker';
/** iOS may keep one more copy of a file from Files in `tmp/<bundle id>-Inbox`. */
const IOS_INBOX_SUFFIX = '-Inbox';
/** The filter only hides photos and videos in the picker; the bytes decide the format. */
const PICKER_TYPES = [
  'application/pdf',
  'text/*',
  'application/vnd.ms-excel',
  'application/octet-stream'
];

const importsDirectory = () => new Directory(Paths.cache, IMPORTS_DIRECTORY);

const copyOf = (operationId: string) => new File(importsDirectory(), operationId);

const deleteQuietly = (entry: File | Directory) => {
  try {
    if (entry.exists) {
      entry.delete();
    }
  } catch (error) {
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.pick_file,
      error_kind: resolveErrorKind(error),
      http_status: null
    });
  }
};

/** The iOS app container `tmp/` folder, next to `Library/Caches`. */
const iosTemporaryDirectory = (): Directory | null => {
  const temporaryUri = Paths.cache.uri.replace(/Library\/Caches\/?$/, 'tmp/');
  if (temporaryUri === Paths.cache.uri) {
    return null;
  }
  return new Directory(temporaryUri);
};

/** Deletes the picker's own copies, and on iOS the system's Inbox copies, at once. */
const clearPickerLeftovers = () => {
  deleteQuietly(new Directory(Paths.cache, PICKER_DIRECTORY));
  if (Platform.OS !== 'ios') {
    return;
  }
  const temporaryDirectory = iosTemporaryDirectory();
  if (!temporaryDirectory?.exists) {
    return;
  }
  try {
    for (const entry of temporaryDirectory.list()) {
      if (entry.name.endsWith(IOS_INBOX_SUFFIX)) {
        deleteQuietly(entry);
      }
    }
  } catch (error) {
    logger.e(LOG_NAME.error_log, {
      type: LOG_TYPE.pick_file,
      error_kind: resolveErrorKind(error),
      http_status: null
    });
  }
};

const ensureImportsDirectory = () => {
  const directory = importsDirectory();
  if (!directory.exists) {
    directory.create({intermediates: true, idempotent: true});
  }
};

/**
 * The private copies of statements in `Paths.cache/imports/`, named by operation id and never by
 * the original name. Android hands the picker result as a `content://` link whose access ends
 * with the activity, so the copy is what a resend after a restart reads. Nothing here reads a
 * whole file into memory, and nothing throws: failures come back as results or null. A failure
 * is logged by its kind only, because file errors carry paths with the original name.
 */
export const statementFileStore: StatementFileStore = {
  pickStatement: async (operationId) => {
    try {
      const pickerResult = await getDocumentAsync({
        type: PICKER_TYPES,
        copyToCacheDirectory: true,
        multiple: false
      });
      if (pickerResult.canceled) {
        clearPickerLeftovers();
        return {success: true, payload: null};
      }
      const [asset] = pickerResult.assets;
      ensureImportsDirectory();
      new File(asset.uri).moveSync(copyOf(operationId));
      clearPickerLeftovers();
      return {
        success: true,
        payload: {
          originalName: asset.name,
          mimeType: asset.mimeType ?? null,
          reportedSizeBytes: asset.size ?? null
        }
      };
    } catch (error) {
      const kind = resolveErrorKind(error);
      logger.e(LOG_NAME.error_log, {type: LOG_TYPE.pick_file, error_kind: kind, http_status: null});
      clearPickerLeftovers();
      deleteQuietly(copyOf(operationId));
      return {success: false, error: {kind, httpStatus: null}};
    }
  },
  readCopySize: (operationId) => {
    try {
      const file = copyOf(operationId);
      if (!file.exists) {
        return null;
      }
      return file.size;
    } catch (error) {
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.pick_file,
        error_kind: resolveErrorKind(error),
        http_status: null
      });
      return null;
    }
  },
  readCopyHeader: (operationId, length) => {
    try {
      const handle = copyOf(operationId).open(FileMode.ReadOnly);
      try {
        return handle.readBytes(length);
      } finally {
        handle.close();
      }
    } catch (error) {
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.pick_file,
        error_kind: resolveErrorKind(error),
        http_status: null
      });
      return null;
    }
  },
  hasCopy: (operationId) => {
    try {
      return copyOf(operationId).exists;
    } catch (error) {
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.pick_file,
        error_kind: resolveErrorKind(error),
        http_status: null
      });
      return false;
    }
  },
  getCopyUri: (operationId) => copyOf(operationId).uri,
  removeCopy: (operationId) => {
    deleteQuietly(copyOf(operationId));
  },
  removeAllExcept: (operationIds) => {
    clearPickerLeftovers();
    const directory = importsDirectory();
    if (!directory.exists) {
      return;
    }
    try {
      for (const entry of directory.list()) {
        if (!operationIds.includes(entry.name)) {
          deleteQuietly(entry);
        }
      }
    } catch (error) {
      logger.e(LOG_NAME.error_log, {
        type: LOG_TYPE.pick_file,
        error_kind: resolveErrorKind(error),
        http_status: null
      });
    }
  }
};
