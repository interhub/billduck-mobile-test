/** Job statuses the server returns; an answer with any other status is unreadable. */
export enum IMPORT_STATUS {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  READY = 'ready',
  DELETING = 'deleting',
  DELETED = 'deleted'
}

/** The statuses of a job whose deletion the server has accepted. */
export const DELETION_STATUSES: readonly IMPORT_STATUS[] = [
  IMPORT_STATUS.DELETING,
  IMPORT_STATUS.DELETED
];
