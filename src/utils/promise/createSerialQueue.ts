/**
 * Runs async tasks one after another in the order they were queued. A read-modify-write of the
 * stored operation must not interleave with another one, or the second write loses the first.
 */
export const createSerialQueue = () => {
  const queue: {tail: Promise<unknown>} = {tail: Promise.resolve()};
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.tail.then(task, task);
    queue.tail = run.catch(() => undefined);
    return run;
  };
};
