import {IMPORT_STATUS} from '@/src/constants/IMPORT_STATUS';
import {ERROR_KIND} from '@/src/utils/errors/resolveErrorKind';

/** What happened between the phone and the server, one row of the response timeline each. */
export enum TIMELINE_EVENT {
  UPLOAD_SENT = 'upload_sent',
  UPLOAD_ACCEPTED = 'upload_accepted',
  UPLOAD_ANSWER_LOST = 'upload_answer_lost',
  UPLOAD_REJECTED = 'upload_rejected',
  APP_RESTARTED = 'app_restarted',
  KEY_LOOKUP_FOUND = 'key_lookup_found',
  KEY_LOOKUP_NOT_FOUND = 'key_lookup_not_found',
  RESENT_SAME_KEY = 'resent_same_key',
  FILE_MISSING = 'file_missing',
  STATUS_APPLIED = 'status_applied',
  STATUS_UNCHANGED = 'status_unchanged',
  STATUS_STALE_SKIPPED = 'status_stale_skipped',
  STATUS_REJECTED = 'status_rejected',
  NO_ANSWER = 'no_answer',
  RECONNECTING = 'reconnecting',
  SERVER_UNAVAILABLE = 'server_unavailable',
  DELETE_SENT = 'delete_sent',
  DELETE_ACCEPTED = 'delete_accepted',
  DELETE_FAILED = 'delete_failed',
  DELETED = 'deleted',
  GONE_ON_SERVER = 'gone_on_server',
  UPLOAD_CANCELLED = 'upload_cancelled',
  CLEANUP_DELETED = 'cleanup_deleted',
  CLEANUP_NOT_FOUND = 'cleanup_not_found',
  /** An answer that came for an operation the phone no longer works on: dropped. */
  LATE_ANSWER_DROPPED = 'late_answer_dropped'
}

export type TimelineEntry = {
  id: number;
  at: string;
  /** Null for the cleanup of a cancelled upload, which no longer has an operation. */
  operationId: string | null;
  event: TIMELINE_EVENT;
  /** True for the deletion of the previous statement while a new one waits to be sent. */
  aboutPrevious: boolean;
  status: IMPORT_STATUS | null;
  revision: number | null;
  httpStatus: number | null;
  errorKind: ERROR_KIND | null;
  attempt: number | null;
  /** How many identical answers in a row this row stands for. */
  repeats: number;
};

export type TimelineEntryInput = Pick<TimelineEntry, 'operationId' | 'event'> &
  Partial<
    Pick<
      TimelineEntry,
      'aboutPrevious' | 'status' | 'revision' | 'httpStatus' | 'errorKind' | 'attempt'
    >
  >;

const REPEATABLE_EVENTS: readonly TIMELINE_EVENT[] = [
  TIMELINE_EVENT.STATUS_UNCHANGED,
  TIMELINE_EVENT.NO_ANSWER
];

const isRepeatOf = (last: TimelineEntry, entry: TimelineEntry): boolean => {
  return (
    REPEATABLE_EVENTS.includes(entry.event) &&
    last.event === entry.event &&
    last.operationId === entry.operationId &&
    last.status === entry.status &&
    last.revision === entry.revision
  );
};

/** A status answer of this operation came older than the one shown and was skipped. */
export const hasSkippedStaleAnswer = (timeline: TimelineEntry[], operationId: string): boolean => {
  return timeline.some(
    (entry) =>
      entry.event === TIMELINE_EVENT.STATUS_STALE_SKIPPED && entry.operationId === operationId
  );
};

/**
 * Appends a row, folding an answer identical to the previous row into it: polling the same
 * status every half second would otherwise push every useful row off the screen.
 */
export const appendTimelineEntry = (
  entries: TimelineEntry[],
  input: TimelineEntryInput,
  context: {id: number; at: string; limit: number}
): TimelineEntry[] => {
  const last = entries[entries.length - 1];
  const entry: TimelineEntry = {
    id: context.id,
    at: context.at,
    operationId: input.operationId,
    event: input.event,
    aboutPrevious: input.aboutPrevious ?? false,
    status: input.status ?? null,
    revision: input.revision ?? null,
    httpStatus: input.httpStatus ?? null,
    errorKind: input.errorKind ?? null,
    attempt: input.attempt ?? null,
    repeats: 1
  };
  if (last && isRepeatOf(last, entry)) {
    return [
      ...entries.slice(0, -1),
      {...last, at: entry.at, attempt: entry.attempt, repeats: last.repeats + 1}
    ];
  }
  return [...entries, entry].slice(-context.limit);
};
