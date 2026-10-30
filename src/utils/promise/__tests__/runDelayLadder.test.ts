import {runDelayLadder} from '@/src/utils/promise/runDelayLadder';

/** Pauses of the ladder under test: the fake wait records them instead of sleeping. */
const LADDER_DELAYS_MS = [1_000, 2_000, 4_000];

const findOnSecondAttempt = async (attempt: number) => {
  if (attempt === 2) {
    return 'found';
  }
  return null;
};

describe('runDelayLadder', () => {
  it('waits before every attempt and stops at the first result', async () => {
    const waits: number[] = [];
    const result = await runDelayLadder(LADDER_DELAYS_MS, findOnSecondAttempt, async (delayMs) => {
      waits.push(delayMs);
    });
    expect(result).toBe('found');
    expect(waits).toEqual([1000, 2000]);
  });

  it('returns null when every attempt failed', async () => {
    const result = await runDelayLadder(
      LADDER_DELAYS_MS,
      async () => null,
      async () => undefined
    );
    expect(result).toBeNull();
  });
});
