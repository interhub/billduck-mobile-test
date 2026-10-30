import {createSerialQueue} from '@/src/utils/promise/createSerialQueue';

describe('createSerialQueue', () => {
  it('runs tasks one after another even when the first one is slower', async () => {
    const serialize = createSerialQueue();
    const order: string[] = [];
    const gate = Promise.withResolvers<void>();
    const slow = serialize(async () => {
      await gate.promise;
      order.push('slow');
    });
    const fast = serialize(async () => {
      order.push('fast');
    });
    await Promise.resolve();
    expect(order).toEqual([]);
    gate.resolve();
    await Promise.all([slow, fast]);
    expect(order).toEqual(['slow', 'fast']);
  });

  it('keeps running after a task fails', async () => {
    const serialize = createSerialQueue();
    await expect(serialize(async () => Promise.reject(new Error('stop')))).rejects.toThrow('stop');
    await expect(serialize(async () => 'next')).resolves.toBe('next');
  });
});
