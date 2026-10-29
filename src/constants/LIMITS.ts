/** Sizes, timeouts, pauses and repeat counts of the import flow. */
export const LIMITS = {
  /** The server refuses a statement above 10 MiB, so the phone refuses it before sending. */
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  /** Bytes read from the start of a file to recognise its format: as many as the server reads. */
  FORMAT_HEADER_BYTES: 24,
  UPLOAD_TIMEOUT_MS: 30_000,
  /** Lookup by key, job status, delete and the test routes. */
  REQUEST_TIMEOUT_MS: 10_000,
  /** Pauses before the automatic lookups by key after an upload answer was lost. */
  RECOVERY_DELAYS_MS: [1_000, 2_000, 4_000],
  POLL_INTERVAL_MS: 500,
  POLL_MAX_BACKOFF_MS: 4_000,
  /** Failed status reads in a row before the timeline says it is reconnecting. */
  POLL_FAILURES_BEFORE_RECONNECTING: 2,
  /** Time without any server answer before polling stops and offers "Retry". */
  SERVER_SILENCE_LIMIT_MS: 30_000,
  /** A cancelled upload unknown to the server is looked up once more after this pause. */
  CLEANUP_RECHECK_DELAY_MS: 5_000,
  /** Status reads while a cleanup waits for the server to confirm the deletion. */
  CLEANUP_POLL_ATTEMPTS: 20,
  TIMELINE_MAX_ENTRIES: 200
} as const;
