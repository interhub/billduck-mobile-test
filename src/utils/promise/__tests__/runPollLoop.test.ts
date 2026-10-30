import {nextBackoffDelay, POLL_STEP, runPollLoop} from '@/src/utils/promise/runPollLoop';

/** The pause after an answer and the cap of the backoff in the loop under test. */
const INTERVAL_MS = 500;
const MAX_BACKOFF_MS = 4_000;

describe('runPollLoop', () => {
  it('doubles the pause after failures up to the maximum and resets it after an answer', async () => {
    const pauses: number[] = [];
    const steps = [
      POLL_STEP.FAILED,
      POLL_STEP.FAILED,
      POLL_STEP.FAILED,
      POLL_STEP.FAILED,
      POLL_STEP.ANSWERED,
      POLL_STEP.STOP
    ];
    await runPollLoop({
      intervalMs: INTERVAL_MS,
      maxBackoffMs: MAX_BACKOFF_MS,
      shouldContinue: () => true,
      readOnce: async () => steps.shift() ?? POLL_STEP.STOP,
      waitFor: async (delayMs) => {
        pauses.push(delayMs);
      }
    });
    expect(pauses).toEqual([1000, 2000, 4000, 4000, 500]);
  });

  it('never starts a read when it should not continue', async () => {
    const readOnce = jest.fn(async () => POLL_STEP.ANSWERED);
    await runPollLoop({
      intervalMs: INTERVAL_MS,
      maxBackoffMs: MAX_BACKOFF_MS,
      shouldContinue: () => false,
      readOnce
    });
    expect(readOnce).not.toHaveBeenCalled();
  });

  it('caps the backoff', () => {
    expect(nextBackoffDelay(MAX_BACKOFF_MS, MAX_BACKOFF_MS)).toBe(MAX_BACKOFF_MS);
  });
});
