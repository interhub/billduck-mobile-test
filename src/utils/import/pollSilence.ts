import {LIMITS} from '@/src/constants/LIMITS';

/** How long the server has been silent during polling. */
export type PollSilence = {
  /** Failed status reads in a row. */
  failures: number;
  /** When the first of them failed. */
  sinceMs: number | null;
};

export const NO_SILENCE: PollSilence = {failures: 0, sinceMs: null};

/** One more failed read; the silence keeps the moment it began. An answer ends it: NO_SILENCE. */
export const addFailedRead = (silence: PollSilence, nowMs: number): PollSilence => {
  return {failures: silence.failures + 1, sinceMs: silence.sinceMs ?? nowMs};
};

/** The failed read after which the timeline says "Reconnecting…". */
export const startsReconnecting = (silence: PollSilence): boolean => {
  return silence.failures === LIMITS.POLL_FAILURES_BEFORE_RECONNECTING;
};

/** Silent for long enough: polling stops and the screen offers "Retry". */
export const isSilenceTooLong = (silence: PollSilence, nowMs: number): boolean => {
  return silence.sinceMs !== null && nowMs - silence.sinceMs >= LIMITS.SERVER_SILENCE_LIMIT_MS;
};
