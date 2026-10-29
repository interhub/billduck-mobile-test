import {createSerialQueue} from '@/src/utils/promise/createSerialQueue';
import {runDelayLadder} from '@/src/utils/promise/runDelayLadder';
import {nextBackoffDelay, POLL_STEP, runPollLoop} from '@/src/utils/promise/runPollLoop';

describe('runDelayLadder', () => {
  it('waits before every attempt and stops at the first result', async () => {
    const waits: number[] = [];
    const result = await runDelayLadder(
      [1000, 2000, 4000],
      async (attempt) => (attempt === 2 ? 'found' : null),
      async (ms) => {
        waits.push(ms);
      }
    );
    expect(result).toBe('found');
    expect(waits).toEqual([1000, 2000]);
  });

  it('returns null when every attempt failed', async () => {
    const result = await runDelayLadder(
      [1, 2, 3],
      async () => null,
      async () => undefined
    );
    expect(result).toBeNull();
  });
});

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
      intervalMs: 500,
      maxBackoffMs: 4000,
      shouldContinue: () => true,
      readOnce: async () => steps.shift() ?? POLL_STEP.STOP,
      waitFor: async (ms) => {
        pauses.push(ms);
      }
    });
    expect(pauses).toEqual([1000, 2000, 4000, 4000, 500]);
  });

  it('never starts a read when it should not continue', async () => {
    const readOnce = jest.fn(async () => POLL_STEP.ANSWERED);
    await runPollLoop({intervalMs: 500, maxBackoffMs: 4000, shouldContinue: () => false, readOnce});
    expect(readOnce).not.toHaveBeenCalled();
  });

  it('caps the backoff', () => {
    expect(nextBackoffDelay(4000, 4000)).toBe(4000);
  });
});

describe('createSerialQueue', () => {
  it('runs tasks one after another even when the first one is slower', async () => {
    const serialize = createSerialQueue();
    const order: string[] = [];
    const slow = serialize(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('slow');
    });
    const fast = serialize(async () => {
      order.push('fast');
    });
    await Promise.all([slow, fast]);
    expect(order).toEqual(['slow', 'fast']);
  });

  it('keeps running after a task fails', async () => {
    const serialize = createSerialQueue();
    await expect(serialize(async () => Promise.reject(new Error('stop')))).rejects.toThrow('stop');
    await expect(serialize(async () => 'next')).resolves.toBe('next');
  });
});
