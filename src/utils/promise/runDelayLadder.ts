import {wait} from '@/src/utils/promise/wait';

type WaitFunction = (ms: number) => Promise<void>;

/**
 * Makes one attempt after each pause of the ladder until an attempt returns a result.
 * Resolves with that result, or with null when every pause was used up.
 */
export const runDelayLadder = async <T>(
  delays: readonly number[],
  attempt: (attemptNumber: number) => Promise<T | null>,
  waitFor: WaitFunction = wait
): Promise<T | null> => {
  for (const [delayIndex, delayMs] of delays.entries()) {
    await waitFor(delayMs);
    const result = await attempt(delayIndex + 1);
    if (result !== null) {
      return result;
    }
  }
  return null;
};
