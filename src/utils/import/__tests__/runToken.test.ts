import {isTokenCurrent, runIdOf} from '@/src/utils/import/runToken';

const TOKEN = {operationId: 'op-1', generation: 2};

describe('runToken', () => {
  it('names one run per operation and generation', () => {
    expect(runIdOf(TOKEN)).toBe('op-1:2');
    expect(runIdOf({...TOKEN, generation: 3})).not.toBe(runIdOf(TOKEN));
  });

  it('keeps an answer only for the same operation in the same generation', () => {
    expect(isTokenCurrent(TOKEN, 2, 'op-1')).toBe(true);
    expect(isTokenCurrent(TOKEN, 3, 'op-1')).toBe(false);
    expect(isTokenCurrent(TOKEN, 2, 'op-2')).toBe(false);
    expect(isTokenCurrent(TOKEN, 2, null)).toBe(false);
  });
});
