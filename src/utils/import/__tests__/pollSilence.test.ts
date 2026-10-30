import {LIMITS} from '@/src/constants/LIMITS';
import {
  addFailedRead,
  isSilenceTooLong,
  NO_SILENCE,
  startsReconnecting
} from '@/src/utils/import/pollSilence';

describe('pollSilence', () => {
  it('counts failed reads from the moment of the first one', () => {
    const first = addFailedRead(NO_SILENCE, 1_000);
    expect(first).toEqual({failures: 1, sinceMs: 1_000});
    expect(addFailedRead(first, 1_500)).toEqual({failures: 2, sinceMs: 1_000});
  });

  it('never changes the silence it was given', () => {
    const silence = {failures: 1, sinceMs: 1_000};
    addFailedRead(silence, 1_500);
    expect(silence).toEqual({failures: 1, sinceMs: 1_000});
  });

  it('says reconnecting at the second failed read only', () => {
    expect(startsReconnecting({failures: 1, sinceMs: 0})).toBe(false);
    expect(
      startsReconnecting({failures: LIMITS.POLL_FAILURES_BEFORE_RECONNECTING, sinceMs: 0})
    ).toBe(true);
    expect(startsReconnecting({failures: 3, sinceMs: 0})).toBe(false);
  });

  it('gives up after the silence limit and not a moment before', () => {
    const silence = {failures: 5, sinceMs: 1_000};
    const limitMs = 1_000 + LIMITS.SERVER_SILENCE_LIMIT_MS;
    expect(isSilenceTooLong(silence, limitMs - 1)).toBe(false);
    expect(isSilenceTooLong(silence, limitMs)).toBe(true);
    expect(isSilenceTooLong(NO_SILENCE, limitMs)).toBe(false);
  });
});
