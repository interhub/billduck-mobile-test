/** Job statuses the server returns; an answer with any other status is unreadable. */
export enum IMPORT_STATUS {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  READY = 'ready',
  DELETING = 'deleting',
  DELETED = 'deleted'
}
