import {LIMITS} from '@/src/constants/LIMITS';
import {FAKE_DELETING_MS, FAKE_PROCESSING_ENDS_MS} from './fakeServer';

/** Room after the last pause a wait is about, for the steps that follow it. */
const SETTLE_MS = 1_000;
/** Room after a poll pause for the read and its answer. */
const READ_MS = 100;

/** One status read: its pause and its answer. */
export const ONE_POLL_MS = LIMITS.POLL_INTERVAL_MS + READ_MS;
/** Two silent reads in a row, the second after a doubled pause: the poll says reconnecting. */
export const UNTIL_RECONNECTING_MS =
  ONE_POLL_MS + LIMITS.POLL_INTERVAL_MS * LIMITS.POLL_BACKOFF_FACTOR;
/** From a 202 to the status read that finds the job ready. */
export const UNTIL_READY_MS = FAKE_PROCESSING_ENDS_MS + LIMITS.POLL_INTERVAL_MS;
/** From a DELETE the server took to the status read that finds the job deleted. */
export const UNTIL_DELETED_MS = FAKE_DELETING_MS + LIMITS.POLL_INTERVAL_MS;
/** The previous statement deleted, then the new one sent and read ready. */
export const UNTIL_REPLACED_MS = UNTIL_DELETED_MS + UNTIL_READY_MS + SETTLE_MS;
/** A cancelled upload found by key, deleted on the server and read deleted. */
export const UNTIL_CLEANED_UP_MS = FAKE_DELETING_MS + SETTLE_MS;
/** The first automatic lookup by key after a lost answer. */
export const UNTIL_FIRST_LOOKUP_MS = LIMITS.RECOVERY_DELAYS_MS[0];
/** The first lookup by key settles the upload: the job is found, or sent again and read ready. */
export const UNTIL_RECOVERED_MS = UNTIL_FIRST_LOOKUP_MS + FAKE_PROCESSING_ENDS_MS + SETTLE_MS;
/** Every lookup of the recovery after its pause: the recovery has given up. */
export const THROUGH_RECOVERY_MS =
  LIMITS.RECOVERY_DELAYS_MS.reduce((total, delayMs) => total + delayMs, 0) + SETTLE_MS;
/** The second look at a cancelled upload that the server did not know at the first one. */
export const PAST_CLEANUP_RECHECK_MS = LIMITS.CLEANUP_RECHECK_DELAY_MS + SETTLE_MS;
/** Longer than the server may stay silent before the polling gives up. */
export const PAST_SILENCE_LIMIT_MS = LIMITS.SERVER_SILENCE_LIMIT_MS + SETTLE_MS;
/** A stay in the background longer than every pause of the recovery and of the polling. */
export const IN_BACKGROUND_MS = 10_000;
/** A minute, longer than the recovery and the silence limit: a planned repeat would have run. */
export const LONGER_THAN_EVERY_REPEAT_MS = 60_000;
