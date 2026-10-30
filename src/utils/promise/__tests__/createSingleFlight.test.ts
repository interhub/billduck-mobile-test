import {createSingleFlight} from '@/src/utils/promise/createSingleFlight';

describe('createSingleFlight', () => {
  it('skips a second start of the running run and resolves it with null', async () => {
    const runOnce = createSingleFlight();
    const gate = Promise.withResolvers<void>();
    const task = jest.fn(async () => {
      await gate.promise;
      return 'done';
    });
    const first = runOnce('op-1:0', task);
    const second = runOnce('op-1:0', task);
    expect(await second).toBeNull();
    gate.resolve();
    expect(await first).toBe('done');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('lets a run with another id take the slot, and only the holder frees it', async () => {
    const runOnce = createSingleFlight();
    const oldGate = Promise.withResolvers<void>();
    const newGate = Promise.withResolvers<void>();
    const oldRun = runOnce('op-1:0', () => oldGate.promise);
    const newRun = runOnce('op-1:1', () => newGate.promise);
    oldGate.resolve();
    await oldRun;
    expect(await runOnce('op-1:1', async () => 'again')).toBeNull();
    newGate.resolve();
    await newRun;
    expect(await runOnce('op-1:1', async () => 'again')).toBe('again');
  });

  it('frees the slot after a task that failed', async () => {
    const runOnce = createSingleFlight();
    await expect(runOnce('op-1:0', async () => Promise.reject(new Error('stop')))).rejects.toThrow(
      'stop'
    );
    expect(await runOnce('op-1:0', async () => 'next')).toBe('next');
  });
});
