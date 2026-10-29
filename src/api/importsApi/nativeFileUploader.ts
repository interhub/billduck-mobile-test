import {File, UploadType} from 'expo-file-system';
import {FileUploader} from '@/src/api/importsApi/importsApi';

/**
 * Streams the private copy from disk as the raw request body; the bytes never pass through JS
 * memory. A foreground session, because an iOS background session outlives a relaunch in ways
 * the app cannot follow. The task resolves with every HTTP answer, 4xx and 5xx included.
 */
export const uploadFileFromDisk: FileUploader = async ({url, fileUri, headers, signal}) => {
  const task = new File(fileUri).createUploadTask(url, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    headers,
    sessionType: 'foreground',
    signal
  });
  const result = await task.uploadAsync();
  return {status: result.status, body: result.body};
};
