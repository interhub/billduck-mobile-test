import {createCoalescedRunner} from '@/src/utils/promise/createCoalescedRunner';

describe('createCoalescedRunner', () => {
  it('runs exactly one more pass for any number of starts during a pass', async () => {
    const runPass = createCoalescedRunner();
    const gates = [Promise.withResolvers<void>(), Promise.withResolvers<void>()];
    const passes: number[] = [];
    const task = async () => {
      passes.push(passes.length + 1);
      await gates[passes.length - 1]?.promise;
    };
    const running = runPass(task);
    await runPass(task);
    await runPass(task);
    expect(passes).toEqual([1]);
    gates[0].resolve();
    gates[1].resolve();
    await running;
    expect(passes).toEqual([1, 2]);
  });

  it('starts a fresh pass once the previous one has ended', async () => {
    const runPass = createCoalescedRunner();
    const task = jest.fn(async () => undefined);
    await runPass(task);
    await runPass(task);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
