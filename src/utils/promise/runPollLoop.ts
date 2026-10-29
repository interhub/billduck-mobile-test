import {wait} from '@/src/utils/promise/wait';

export enum POLL_STEP {
  /** The read got an answer: the next one comes after the normal interval. */
  ANSWERED = 'answered',
  /** The read got no answer: the pause before the next one doubles, up to the maximum. */
  FAILED = 'failed',
  STOP = 'stop'
}

type PollLoopOptions = {
  intervalMs: number;
  maxBackoffMs: number;
  /** Checked before every read; false ends the loop. */
  shouldContinue: () => boolean;
  readOnce: () => Promise<POLL_STEP>;
  waitFor?: (ms: number) => Promise<void>;
};

export const nextBackoffDelay = (currentDelayMs: number, maxBackoffMs: number): number => {
  return Math.min(currentDelayMs * 2, maxBackoffMs);
};

const nextPause = (
  step: POLL_STEP,
  currentDelayMs: number,
  intervalMs: number,
  maxBackoffMs: number
): number => {
  if (step === POLL_STEP.ANSWERED) {
    return intervalMs;
  }
  return nextBackoffDelay(currentDelayMs, maxBackoffMs);
};

/**
 * Sequential polling: the next read is scheduled only after the previous one settled, so two
 * reads are never in flight. Failures back off by doubling the pause; an answer resets it.
 */
export const runPollLoop = async ({
  intervalMs,
  maxBackoffMs,
  shouldContinue,
  readOnce,
  waitFor = wait
}: PollLoopOptions): Promise<void> => {
  const pause = {delayMs: intervalMs};
  while (shouldContinue()) {
    const step = await readOnce();
    if (step === POLL_STEP.STOP) {
      return;
    }
    pause.delayMs = nextPause(step, pause.delayMs, intervalMs, maxBackoffMs);
    await waitFor(pause.delayMs);
  }
};
